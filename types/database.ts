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

