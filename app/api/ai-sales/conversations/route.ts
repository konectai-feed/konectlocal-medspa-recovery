import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken } from '@/lib/assessment/service';
import { recordSessionEvent } from '@/lib/assessment/service';

const conversationSchema = z.object({
  leadId: z.string().min(1),
  assessmentId: z.string().optional(),
  message: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = conversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const token = crypto.randomUUID();
  const tokenHash = hashToken(token);
  const { data: conversation, error } = await supabase.from('ai_sales_conversations').insert({ lead_id: parsed.data.leadId, assessment_id: parsed.data.assessmentId ?? null, conversation_token_hash: tokenHash, status: 'active' }).select('id').single();
  if (error || !conversation) {
    return NextResponse.json({ error: 'Unable to create conversation' }, { status: 500 });
  }

  const action = parsed.data.message.toLowerCase().includes('checkout') || parsed.data.message.toLowerCase().includes('buy') ? 'open_checkout' : parsed.data.message.toLowerCase().includes('schedule') || parsed.data.message.toLowerCase().includes('book') ? 'schedule_review' : 'none';
  await supabase.from('ai_sales_messages').insert({ conversation_id: conversation.id, role: 'user', message: parsed.data.message, action_suggestion: action });
  await recordSessionEvent({ sessionId: null, assessmentId: parsed.data.assessmentId ?? null, leadId: parsed.data.leadId, eventType: 'ai_sales_chat_opened', eventData: { message: parsed.data.message, action }, source: 'web' });
  return NextResponse.json({ conversationToken: token, action });
}
