import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { hashToken } from '@/lib/assessment/service';

export async function GET(_request: Request, { params }: { params: { conversationToken: string } }) {
  const supabase = createSupabaseServiceRoleClient();
  const tokenHash = hashToken(params.conversationToken);
  const { data: conversation } = await supabase.from('ai_sales_conversations').select('*').eq('conversation_token_hash', tokenHash).maybeSingle();
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }
  const { data: messages } = await supabase.from('ai_sales_messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true });
  return NextResponse.json({ conversation, messages: messages ?? [] });
}
