export type ProductType = 'plugin' | 'rank' | 'item' | 'money';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category: string;
  version?: string;
  compatible_versions: string[];
  download_url?: string;
  jar_file_path?: string;
  jar_file_size?: number;
  plugin_version?: string;
  minecraft_versions?: string[];
  author?: string;
  changelog?: string;
  product_type?: ProductType;
  minecraft_username?: string;
  minecraft_uuid?: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  flow_token?: string;
  flow_order?: number;
  commerce_order: string;
  minecraft_username?: string;
  minecraft_uuid?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: string;
  user_id: string;
  product_id: string;
  order_id?: string;
  license_key: string;
  status: 'active' | 'revoked' | 'expired';
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  order_id?: string;
  license_id?: string;
  purchased_at: string;
}

export interface ProductDownload {
  id: string;
  user_id: string;
  product_id: string;
  order_id?: string;
  license_id?: string;
  download_token: string;
  download_url: string;
  expires_at: string;
  used_at?: string;
  used: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface PluginVersion {
  id: string;
  product_id: string;
  version: string;
  jar_file_path: string;
  jar_file_size?: number;
  changelog?: string;
  is_active: boolean;
  release_date: string;
  created_at: string;
}

export interface MinecraftServer {
  id: string;
  name: string;
  host: string;
  port: number;
  api_key: string;
  api_secret: string;
  rcon_host?: string;
  rcon_port?: number;
  rcon_password?: string;
  webhook_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rank {
  id: string;
  product_id: string;
  luckperms_group: string;
  priority: number;
  prefix?: string;
  suffix?: string;
  weight?: number;
  display_name?: string;
  description?: string;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface RankCommand {
  id: string;
  rank_id: string;
  command: string;
  command_type: 'luckperms' | 'console' | 'player';
  execution_order: number;
  server_id?: string;
  created_at: string;
}

export interface GameItem {
  id: string;
  product_id: string;
  item_type: string;
  item_id?: string;
  item_data?: string;
  quantity: number;
  commands?: string[];
  created_at: string;
  updated_at: string;
}

export interface GameMoney {
  id: string;
  product_id: string;
  amount: number;
  currency_type: 'vault' | 'playerpoints' | 'custom';
  command?: string;
  created_at: string;
  updated_at: string;
}

export interface MinecraftOrder {
  id: string;
  order_id: string;
  minecraft_username: string;
  minecraft_uuid: string;
  server_id?: string;
  status: 'pending' | 'applied' | 'failed' | 'retrying';
  error_message?: string;
  applied_at?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExecutedCommand {
  id: string;
  minecraft_order_id: string;
  server_id?: string;
  command: string;
  command_type: string;
  status: 'pending' | 'success' | 'failed';
  response?: string;
  error_message?: string;
  executed_at?: string;
  created_at: string;
}

