import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/services/webhook.service';

// Flow puede llamar al webhook con POST o GET
export async function POST(request: NextRequest) {
  const webhookService = new WebhookService();
  return webhookService.processWebhook(request);
}

export async function GET(request: NextRequest) {
  const webhookService = new WebhookService();
  return webhookService.processWebhook(request);
}
