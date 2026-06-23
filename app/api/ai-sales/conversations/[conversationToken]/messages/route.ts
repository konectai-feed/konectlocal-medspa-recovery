import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken } from '@/lib/assessment/service';
import { recordSessionEvent } from '@/lib/assessment/service';

const messageSchema = z.object({
  message: z.string().min(1).max(500),
});

export async function POST(request: Request, { params }: { params: { conversationToken: string } }) {
  const body = await request.json().catch(() => ({}));
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(params.conversationToken);
  const { data: conversation } = await supabase.from('ai_sales_conversations').select('*').eq('conversation_token_hash', tokenHash).maybeSingle();
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  await supabase.from('ai_sales_messages').insert({ conversation_id: conversation.id, role: 'user', message: parsed.data.message, action_suggestion: 'none' });
  await recordSessionEvent({ sessionId: null, assessmentId: conversation.assessment_id, leadId: conversation.lead_id, eventType: 'ai_sales_message_sent', eventData: { message: parsed.data.message }, source: 'web' });
  return NextResponse.json({ action: 'none' });
}
