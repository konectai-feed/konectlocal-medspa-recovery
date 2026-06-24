import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken } from '@/lib/assessment/service';
import { recordSessionEvent } from '@/lib/assessment/service';
import { createAISalesAdapter } from '@/lib/ai-sales/provider';

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

  const adapter = createAISalesAdapter();
  const result = await adapter.generateReply({ message: parsed.data.message, leadContext: { leadId: parsed.data.leadId, assessmentId: parsed.data.assessmentId ?? null } });
  await supabase.from('ai_sales_messages').insert({ conversation_id: conversation.id, role: 'user', message: parsed.data.message, action_suggestion: result.action });
  await recordSessionEvent({ sessionId: null, assessmentId: parsed.data.assessmentId ?? null, leadId: parsed.data.leadId, eventType: 'ai_sales_chat_opened', eventData: { message: parsed.data.message, action: result.action, safe: result.safe }, source: 'web' });
  return NextResponse.json({ conversationToken: token, action: result.action, reply: result.reply, safe: result.safe });
}
