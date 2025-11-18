import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MinecraftServer, Rank, RankCommand, GameItem, GameMoney, MinecraftOrder, ExecutedCommand } from '@/types/database';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * Servicio para gestionar integración con servidores de Minecraft
 */
export class MinecraftService {
  private supabase = createServerClient();
  private supabaseAdmin = createAdminClient();

  /**
   * Verifica la autenticación del plugin mediante API key y secret
   */
  async verifyPluginAuth(apiKey: string, signature: string, body: string): Promise<MinecraftServer | null> {
    try {
      // Buscar servidor por API key
      const { data: server, error } = await this.supabaseAdmin
        .from('minecraft_servers')
        .select('*')
        .eq('api_key', apiKey)
        .eq('active', true)
        .single();

      if (error || !server) {
        logger.warn('Intento de autenticación con API key inválida', { apiKey });
        return null;
      }

      // Verificar firma HMAC
      const expectedSignature = crypto
        .createHmac('sha256', server.api_secret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('Firma HMAC inválida', { apiKey });
        return null;
      }

      return server;
    } catch (error) {
      logger.error('Error verificando autenticación del plugin', error);
      return null;
    }
  }

  /**
   * Obtiene un servidor por ID
   */
  async getServer(serverId: string): Promise<MinecraftServer | null> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('minecraft_servers')
        .select('*')
        .eq('id', serverId)
        .eq('active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error obteniendo servidor', error);
      return null;
    }
  }

  /**
   * Ejecuta un comando en el servidor de Minecraft
   * Puede usar webhook, RCON, o comunicación directa con el plugin
   */
  async executeCommand(
    server: MinecraftServer,
    command: string,
    commandType: 'luckperms' | 'console' | 'player' = 'console',
    minecraftOrderId?: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      // Registrar comando en la base de datos
      let executedCommandId: string | null = null;
      if (minecraftOrderId) {
        const { data: executedCommand, error: cmdError } = await this.supabaseAdmin
          .from('executed_commands')
          .insert({
            minecraft_order_id: minecraftOrderId,
            server_id: server.id,
            command,
            command_type: commandType,
            status: 'pending',
          })
          .select()
          .single();

        if (!cmdError && executedCommand) {
          executedCommandId = executedCommand.id;
        }
      }

      let result: { success: boolean; response?: string; error?: string };

      // Si hay webhook_url, usar webhook (método preferido para plugins)
      if (server.webhook_url) {
        result = await this.executeCommandViaWebhook(server, command, commandType);
      } else if (server.rcon_host && server.rcon_password) {
        // Usar RCON como fallback
        result = await this.executeCommandViaRCON(server, command);
      } else {
        // Si no hay método configurado, retornar error
        result = {
          success: false,
          error: 'No hay método de ejecución configurado para este servidor',
        };
      }

      // Actualizar estado del comando ejecutado
      if (executedCommandId) {
        await this.supabaseAdmin
          .from('executed_commands')
          .update({
            status: result.success ? 'success' : 'failed',
            response: result.response,
            error_message: result.error,
            executed_at: new Date().toISOString(),
          })
          .eq('id', executedCommandId);
      }

      return result;
    } catch (error) {
      logger.error('Error ejecutando comando', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Ejecuta comando vía webhook (comunicación con plugin Java)
   */
  private async executeCommandViaWebhook(
    server: MinecraftServer,
    command: string,
    commandType: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      if (!server.webhook_url) {
        return { success: false, error: 'Webhook URL no configurada' };
      }

      const response = await fetch(server.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': server.api_key,
        },
        body: JSON.stringify({
          command,
          command_type: commandType,
          server_id: server.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Error del servidor: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: data.success || false,
        response: data.response,
        error: data.error,
      };
    } catch (error) {
      logger.error('Error ejecutando comando vía webhook', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Ejecuta comando vía RCON (fallback)
   */
  private async executeCommandViaRCON(
    server: MinecraftServer,
    command: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    // Nota: RCON requiere una librería adicional como 'rcon-client'
    // Por ahora, retornamos un error indicando que RCON no está implementado
    // El usuario puede implementar RCON o usar webhooks
    logger.warn('RCON no está implementado, usando webhook es recomendado');
    return {
      success: false,
      error: 'RCON no está implementado. Configure webhook_url para usar el plugin Java.',
    };
  }

  /**
   * Aplica un rango a un jugador
   */
  async applyRank(
    serverId: string,
    minecraftUsername: string,
    minecraftUuid: string,
    rank: Rank,
    minecraftOrderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const server = await this.getServer(serverId);
      if (!server) {
        return { success: false, error: 'Servidor no encontrado' };
      }

      // Obtener comandos del rango ordenados
      const { data: commands, error: commandsError } = await this.supabaseAdmin
        .from('rank_commands')
        .select('*')
        .eq('rank_id', rank.id)
        .or(`server_id.is.null,server_id.eq.${serverId}`)
        .order('execution_order', { ascending: true });

      if (commandsError) {
        logger.error('Error obteniendo comandos del rango', commandsError);
        return { success: false, error: 'Error obteniendo comandos del rango' };
      }

      if (!commands || commands.length === 0) {
        // Si no hay comandos personalizados, usar comando LuckPerms por defecto
        const defaultCommand = `lp user ${minecraftUsername} parent set ${rank.luckperms_group}`;
        const result = await this.executeCommand(server, defaultCommand, 'luckperms', minecraftOrderId);
        return result;
      }

      // Ejecutar todos los comandos en orden
      let allSuccess = true;
      let lastError: string | undefined;

      for (const cmd of commands) {
        // Reemplazar placeholders en el comando
        const processedCommand = cmd.command
          .replace(/{username}/g, minecraftUsername)
          .replace(/{uuid}/g, minecraftUuid)
          .replace(/{group}/g, rank.luckperms_group);

        const result = await this.executeCommand(
          server,
          processedCommand,
          cmd.command_type as 'luckperms' | 'console' | 'player',
          minecraftOrderId
        );

        if (!result.success) {
          allSuccess = false;
          lastError = result.error;
          logger.warn('Comando falló al aplicar rango', {
            command: processedCommand,
            error: result.error,
          });
          // Continuar ejecutando otros comandos aunque uno falle
        }
      }

      return {
        success: allSuccess,
        error: lastError,
      };
    } catch (error) {
      logger.error('Error aplicando rango', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Aplica items a un jugador
   */
  async applyItems(
    serverId: string,
    minecraftUsername: string,
    minecraftUuid: string,
    gameItem: GameItem,
    minecraftOrderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const server = await this.getServer(serverId);
      if (!server) {
        return { success: false, error: 'Servidor no encontrado' };
      }

      if (gameItem.commands && gameItem.commands.length > 0) {
        // Ejecutar comandos personalizados
        let allSuccess = true;
        let lastError: string | undefined;

        for (const cmd of gameItem.commands) {
          const processedCommand = cmd
            .replace(/{username}/g, minecraftUsername)
            .replace(/{uuid}/g, minecraftUuid)
            .replace(/{quantity}/g, gameItem.quantity.toString())
            .replace(/{item}/g, gameItem.item_id || '');

          const result = await this.executeCommand(server, processedCommand, 'console', minecraftOrderId);

          if (!result.success) {
            allSuccess = false;
            lastError = result.error;
          }
        }

        return { success: allSuccess, error: lastError };
      } else {
        // Comando por defecto para dar items
        const defaultCommand = `give ${minecraftUsername} ${gameItem.item_id || 'diamond'} ${gameItem.quantity}`;
        const result = await this.executeCommand(server, defaultCommand, 'console', minecraftOrderId);
        return result;
      }
    } catch (error) {
      logger.error('Error aplicando items', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Aplica dinero a un jugador
   */
  async applyMoney(
    serverId: string,
    minecraftUsername: string,
    minecraftUuid: string,
    gameMoney: GameMoney,
    minecraftOrderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const server = await this.getServer(serverId);
      if (!server) {
        return { success: false, error: 'Servidor no encontrado' };
      }

      if (gameMoney.command) {
        // Usar comando personalizado
        const processedCommand = gameMoney.command
          .replace(/{username}/g, minecraftUsername)
          .replace(/{uuid}/g, minecraftUuid)
          .replace(/{amount}/g, gameMoney.amount.toString());

        const result = await this.executeCommand(server, processedCommand, 'console', minecraftOrderId);
        return result;
      } else {
        // Comandos por defecto según el tipo de moneda
        let defaultCommand: string;
        switch (gameMoney.currency_type) {
          case 'vault':
            defaultCommand = `eco give ${minecraftUsername} ${gameMoney.amount}`;
            break;
          case 'playerpoints':
            defaultCommand = `points give ${minecraftUsername} ${gameMoney.amount}`;
            break;
          default:
            return { success: false, error: 'Tipo de moneda no soportado sin comando personalizado' };
        }

        const result = await this.executeCommand(server, defaultCommand, 'console', minecraftOrderId);
        return result;
      }
    } catch (error) {
      logger.error('Error aplicando dinero', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Crea una orden de Minecraft
   */
  async createMinecraftOrder(
    orderId: string,
    minecraftUsername: string,
    minecraftUuid: string,
    serverId?: string
  ): Promise<MinecraftOrder | null> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('minecraft_orders')
        .insert({
          order_id: orderId,
          minecraft_username: minecraftUsername,
          minecraft_uuid: minecraftUuid,
          server_id: serverId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creando orden de Minecraft', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error creando orden de Minecraft', error);
      return null;
    }
  }

  /**
   * Actualiza el estado de una orden de Minecraft
   */
  async updateMinecraftOrderStatus(
    minecraftOrderId: string,
    status: 'pending' | 'applied' | 'failed' | 'retrying',
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'applied') {
        updateData.applied_at = new Date().toISOString();
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      if (status === 'retrying') {
        // Incrementar contador de reintentos
        const { data: order } = await this.supabaseAdmin
          .from('minecraft_orders')
          .select('retry_count')
          .eq('id', minecraftOrderId)
          .single();

        if (order) {
          updateData.retry_count = (order.retry_count || 0) + 1;
        }
      }

      await this.supabaseAdmin
        .from('minecraft_orders')
        .update(updateData)
        .eq('id', minecraftOrderId);
    } catch (error) {
      logger.error('Error actualizando estado de orden de Minecraft', error);
    }
  }
}

