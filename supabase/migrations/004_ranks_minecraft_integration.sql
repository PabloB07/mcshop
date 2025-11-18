-- ============================================
-- Sistema de Rangos y Integración con Minecraft
-- ============================================

-- Tabla de tipos de productos (rank, item, money, plugin)
-- Actualizar tabla products para incluir tipo de producto
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'plugin' CHECK (product_type IN ('plugin', 'rank', 'item', 'money')),
ADD COLUMN IF NOT EXISTS minecraft_username TEXT,
ADD COLUMN IF NOT EXISTS minecraft_uuid TEXT;

-- Actualizar tabla orders para incluir información de Minecraft
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS minecraft_username TEXT,
ADD COLUMN IF NOT EXISTS minecraft_uuid TEXT;

-- Tabla de servidores de Minecraft
CREATE TABLE IF NOT EXISTS minecraft_servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER DEFAULT 25565,
  api_key TEXT UNIQUE NOT NULL, -- API key para autenticación del plugin
  api_secret TEXT NOT NULL, -- Secret para verificar requests
  rcon_host TEXT,
  rcon_port INTEGER DEFAULT 25575,
  rcon_password TEXT,
  webhook_url TEXT, -- URL para enviar comandos al servidor
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de rangos
CREATE TABLE IF NOT EXISTS ranks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  luckperms_group TEXT NOT NULL, -- Nombre del grupo en LuckPerms
  priority INTEGER DEFAULT 0, -- Prioridad del rango (mayor = más importante)
  prefix TEXT, -- Prefijo del rango
  suffix TEXT, -- Sufijo del rango
  weight INTEGER, -- Peso del rango en LuckPerms
  display_name TEXT, -- Nombre para mostrar
  description TEXT,
  permissions TEXT[], -- Permisos adicionales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comandos para rangos
CREATE TABLE IF NOT EXISTS rank_commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rank_id UUID REFERENCES ranks(id) ON DELETE CASCADE NOT NULL,
  command TEXT NOT NULL, -- Comando a ejecutar (ej: "lp user {username} parent set {group}")
  command_type TEXT DEFAULT 'luckperms' CHECK (command_type IN ('luckperms', 'console', 'player')),
  execution_order INTEGER DEFAULT 0, -- Orden de ejecución
  server_id UUID REFERENCES minecraft_servers(id) ON DELETE SET NULL, -- NULL = todos los servidores
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items del juego
CREATE TABLE IF NOT EXISTS game_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  item_type TEXT NOT NULL, -- 'item', 'command', 'kit'
  item_id TEXT, -- ID del item (ej: "diamond_sword")
  item_data TEXT, -- NBT data o datos adicionales
  quantity INTEGER DEFAULT 1,
  commands TEXT[], -- Comandos para dar items (ej: "give {username} diamond 64")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de dinero en juego
CREATE TABLE IF NOT EXISTS game_money (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency_type TEXT DEFAULT 'vault' CHECK (currency_type IN ('vault', 'playerpoints', 'custom')),
  command TEXT, -- Comando para dar dinero (ej: "eco give {username} {amount}")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de órdenes de Minecraft (para tracking de aplicaciones)
CREATE TABLE IF NOT EXISTS minecraft_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  minecraft_username TEXT NOT NULL,
  minecraft_uuid TEXT NOT NULL,
  server_id UUID REFERENCES minecraft_servers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed', 'retrying')),
  error_message TEXT,
  applied_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comandos ejecutados (log)
CREATE TABLE IF NOT EXISTS executed_commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  minecraft_order_id UUID REFERENCES minecraft_orders(id) ON DELETE CASCADE,
  server_id UUID REFERENCES minecraft_servers(id) ON DELETE SET NULL,
  command TEXT NOT NULL,
  command_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  response TEXT,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_minecraft_uuid ON products(minecraft_uuid);
CREATE INDEX IF NOT EXISTS idx_ranks_product_id ON ranks(product_id);
CREATE INDEX IF NOT EXISTS idx_ranks_luckperms_group ON ranks(luckperms_group);
CREATE INDEX IF NOT EXISTS idx_rank_commands_rank_id ON rank_commands(rank_id);
CREATE INDEX IF NOT EXISTS idx_rank_commands_server_id ON rank_commands(server_id);
CREATE INDEX IF NOT EXISTS idx_game_items_product_id ON game_items(product_id);
CREATE INDEX IF NOT EXISTS idx_game_money_product_id ON game_money(product_id);
CREATE INDEX IF NOT EXISTS idx_minecraft_orders_order_id ON minecraft_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_minecraft_orders_minecraft_uuid ON minecraft_orders(minecraft_uuid);
CREATE INDEX IF NOT EXISTS idx_minecraft_orders_status ON minecraft_orders(status);
CREATE INDEX IF NOT EXISTS idx_executed_commands_minecraft_order_id ON executed_commands(minecraft_order_id);
CREATE INDEX IF NOT EXISTS idx_executed_commands_status ON executed_commands(status);
CREATE INDEX IF NOT EXISTS idx_minecraft_servers_api_key ON minecraft_servers(api_key);
CREATE INDEX IF NOT EXISTS idx_minecraft_servers_active ON minecraft_servers(active);

-- Habilitar RLS
ALTER TABLE minecraft_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_money ENABLE ROW LEVEL SECURITY;
ALTER TABLE minecraft_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE executed_commands ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para minecraft_servers (solo admins)
DROP POLICY IF EXISTS "Admins can manage servers" ON minecraft_servers;
CREATE POLICY "Admins can manage servers" ON minecraft_servers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Políticas RLS para ranks (público puede leer, admins pueden modificar)
DROP POLICY IF EXISTS "Public can view ranks" ON ranks;
CREATE POLICY "Public can view ranks" ON ranks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage ranks" ON ranks;
CREATE POLICY "Admins can manage ranks" ON ranks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Políticas RLS para rank_commands (público puede leer, admins pueden modificar)
DROP POLICY IF EXISTS "Public can view rank commands" ON rank_commands;
CREATE POLICY "Public can view rank commands" ON rank_commands
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage rank commands" ON rank_commands;
CREATE POLICY "Admins can manage rank commands" ON rank_commands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Políticas RLS para game_items (público puede leer, admins pueden modificar)
DROP POLICY IF EXISTS "Public can view game items" ON game_items;
CREATE POLICY "Public can view game items" ON game_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage game items" ON game_items;
CREATE POLICY "Admins can manage game items" ON game_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Políticas RLS para game_money (público puede leer, admins pueden modificar)
DROP POLICY IF EXISTS "Public can view game money" ON game_money;
CREATE POLICY "Public can view game money" ON game_money
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage game money" ON game_money;
CREATE POLICY "Admins can manage game money" ON game_money
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Políticas RLS para minecraft_orders (usuarios ven sus propias órdenes, admins ven todas)
DROP POLICY IF EXISTS "Users can view own minecraft orders" ON minecraft_orders;
CREATE POLICY "Users can view own minecraft orders" ON minecraft_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = minecraft_orders.order_id
      AND orders.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Políticas RLS para executed_commands (solo admins)
DROP POLICY IF EXISTS "Admins can view executed commands" ON executed_commands;
CREATE POLICY "Admins can view executed commands" ON executed_commands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_minecraft_servers_updated_at ON minecraft_servers;
CREATE TRIGGER update_minecraft_servers_updated_at
    BEFORE UPDATE ON minecraft_servers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ranks_updated_at ON ranks;
CREATE TRIGGER update_ranks_updated_at
    BEFORE UPDATE ON ranks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_items_updated_at ON game_items;
CREATE TRIGGER update_game_items_updated_at
    BEFORE UPDATE ON game_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_money_updated_at ON game_money;
CREATE TRIGGER update_game_money_updated_at
    BEFORE UPDATE ON game_money
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_minecraft_orders_updated_at ON minecraft_orders;
CREATE TRIGGER update_minecraft_orders_updated_at
    BEFORE UPDATE ON minecraft_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para generar API key único
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    IF i = 8 OR i = 16 OR i = 24 THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para generar API secret
CREATE OR REPLACE FUNCTION generate_api_secret()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..64 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

