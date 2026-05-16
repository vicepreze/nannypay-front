import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 });

  const svix_id        = req.headers.get('svix-id')        ?? '';
  const svix_timestamp = req.headers.get('svix-timestamp') ?? '';
  const svix_signature = req.headers.get('svix-signature') ?? '';

  const body = await req.text();
  const wh   = new Webhook(secret);

  let event: WebhookEvent;
  try {
    event = wh.verify(body, {
      'svix-id':        svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = event.data;
    const email = email_addresses?.[0]?.email_address ?? '';
    await prisma.user.upsert({
      where:  { id },
      update: { email, prenom: first_name ?? null, nom: last_name ?? null },
      create: { id, email, prenom: first_name ?? null, nom: last_name ?? null },
    });
  }

  if (event.type === 'user.deleted') {
    const { id } = event.data;
    if (id) await prisma.user.deleteMany({ where: { id } });
  }

  return NextResponse.json({ received: true });
}
