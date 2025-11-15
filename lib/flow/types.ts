export interface FlowConfig {
  apiKey: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
}

export interface FlowPaymentOrder {
  commerceOrder: string;
  subject: string;
  currency?: string;
  amount: number;
  email: string;
  urlConfirmation?: string;
  urlReturn?: string;
  paymentMethod?: number;
  forward_days_after?: number;
  forward_days_after_type?: number;
  optional?: Record<string, any>;
}

export interface FlowPaymentResponse {
  token: string;
  url: string;
  flowOrder: number;
}

export interface FlowPaymentStatus {
  status: number;
  flowOrder: number;
  commerceOrder: string;
  requestDate: string;
  statusDate: string;
  amount: number;
  currency: string;
  payer: string;
  paymentData: {
    date: string;
    media: number;
    mediaName: string;
    number: string;
    receipt: string;
  };
  pending_info: {
    media: number;
    date: string;
  };
}

export interface FlowRefundRequest {
  token: string;
  amount?: number;
  comment?: string;
}

export interface FlowRefundResponse {
  refundOrder: number;
  type: string;
  token: string;
  flowOrder: number;
  amount: number;
  date: string;
  status: number;
}

