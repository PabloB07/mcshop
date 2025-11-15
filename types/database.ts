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

