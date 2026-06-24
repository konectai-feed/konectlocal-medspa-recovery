import { serverEnv } from '@/lib/env.server';

export type AISalesReply = {
  reply: string;
  action: 'none' | 'open_checkout' | 'schedule_review' | 'manual_review';
  safe: boolean;
  provider: string;
  model?: string;
};

export type AISalesRequest = {
  message: string;
  leadContext?: Record<string, unknown>;
};

const moderationKeywords = ['ignore', 'bypass', 'exploit', 'hack', 'attack', 'malware'];

function moderateMessage(message: string) {
  const normalized = message.toLowerCase();
  const blocked = moderationKeywords.some((keyword) => normalized.includes(keyword));
  return {
    blocked,
    reason: blocked ? 'Contains restricted content' : undefined,
  };
}

export function createAISalesAdapter(provider = serverEnv.AI_SALES_PROVIDER) {
  return {
    async generateReply(input: AISalesRequest): Promise<AISalesReply> {
      const moderation = moderateMessage(input.message);
      if (moderation.blocked) {
        return {
          reply: 'I can help with package options, pricing, and booking next steps.',
          action: 'manual_review',
          safe: false,
          provider,
          model: serverEnv.AI_SALES_MODEL,
        };
      }

      const action = input.message.toLowerCase().includes('checkout') || input.message.toLowerCase().includes('buy')
        ? 'open_checkout'
        : input.message.toLowerCase().includes('schedule') || input.message.toLowerCase().includes('book')
          ? 'schedule_review'
          : 'none';

      return {
        reply: 'I can help you review the recovery opportunity and next steps.',
        action,
        safe: true,
        provider,
        model: serverEnv.AI_SALES_MODEL,
      };
    },
  };
}
