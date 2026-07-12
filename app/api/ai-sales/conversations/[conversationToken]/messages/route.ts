import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken } from '@/lib/assessment/service';
import { recordSessionEvent } from '@/lib/assessment/service';
import { buildAISalesAssessmentSummary } from '@/lib/ai-sales/context';
import { createAISalesAdapter } from '@/lib/ai-sales/provider';
import { aiAssessmentContextLoadError } from '@/lib/ai-sales/shared';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(1000),
});

const messageSchema = z.object({
  leadId: z.string().min(1).optional(),
  assessmentId: z.string().optional(),
  reportToken: z.string().min(1).optional(),
  message: z.string().min(1).max(500),
  messages: z.array(chatMessageSchema).max(20).optional(),
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

  const assessmentSummary = await buildAISalesAssessmentSummary({
    reportToken: parsed.data.reportToken,
    leadId: conversation.lead_id,
    assessmentId: conversation.assessment_id,
  });
  if (!assessmentSummary) {
    return NextResponse.json({ error: aiAssessmentContextLoadError }, { status: 404 });
  }

  const adapter = createAISalesAdapter();
  const result = await adapter.generateReply({
    message: parsed.data.message,
    messages: parsed.data.messages,
    leadContext: {
      leadId: conversation.lead_id,
      assessmentId: conversation.assessment_id,
      reportToken: parsed.data.reportToken,
      assessmentSummary,
    },
  });
  await supabase.from('ai_sales_messages').insert([
    { conversation_id: conversation.id, role: 'user', message: parsed.data.message },
    { conversation_id: conversation.id, role: 'assistant', message: result.reply, action_suggestion: result.action },
  ]);
  await recordSessionEvent({ sessionId: null, assessmentId: conversation.assessment_id, leadId: conversation.lead_id, eventType: 'ai_sales_message_sent', eventData: { message: parsed.data.message, action: result.action, safe: result.safe, visibleMessages: parsed.data.messages?.length ?? 0 }, source: 'web' });
  return NextResponse.json({ action: result.action, reply: result.reply, safe: result.safe });
}
