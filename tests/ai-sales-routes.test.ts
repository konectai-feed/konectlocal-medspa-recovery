import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildAISalesAssessmentSummary: vi.fn(),
  recordSessionEvent: vi.fn(),
  hashToken: vi.fn(() => 'hashed-token'),
  createAISalesAdapter: vi.fn(() => ({ generateReply: vi.fn() })),
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              id: 'conversation-1',
              lead_id: 'lead-1',
              assessment_id: 'assessment-1',
            },
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/ai-sales/context', () => ({
  buildAISalesAssessmentSummary: mocks.buildAISalesAssessmentSummary,
}));

vi.mock('@/lib/ai-sales/shared', () => ({
  aiAssessmentContextLoadError: 'I could not load your assessment context. Please refresh the page or schedule a review.',
}));

vi.mock('@/lib/assessment/service', () => ({
  hashToken: mocks.hashToken,
  recordSessionEvent: mocks.recordSessionEvent,
}));

vi.mock('@/lib/ai-sales/provider', () => ({
  createAISalesAdapter: mocks.createAISalesAdapter,
}));

vi.mock('@/lib/supabase/service-role', () => ({
  createSupabaseServiceRoleClient: mocks.createSupabaseServiceRoleClient,
}));

import { POST as createConversation } from '@/app/api/ai-sales/conversations/route';
import { POST as createConversationMessage } from '@/app/api/ai-sales/conversations/[conversationToken]/messages/route';

describe('AI sales conversation routes', () => {
  beforeEach(() => {
    mocks.buildAISalesAssessmentSummary.mockReset();
    mocks.recordSessionEvent.mockReset();
    mocks.hashToken.mockClear();
    mocks.createAISalesAdapter.mockClear();
    mocks.createSupabaseServiceRoleClient.mockClear();
  });

  it('returns a friendly error when the initial chat context cannot be loaded', async () => {
    mocks.buildAISalesAssessmentSummary.mockResolvedValue(null);

    const response = await createConversation(new Request('http://localhost/api/ai-sales/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: 'lead-1',
        assessmentId: 'assessment-1',
        message: 'Please explain my assessment results and recommended recovery plan.',
      }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'I could not load your assessment context. Please refresh the page or schedule a review.',
    });
  });

  it('returns a friendly error when a follow-up chat context cannot be loaded', async () => {
    mocks.buildAISalesAssessmentSummary.mockResolvedValue(null);

    const response = await createConversationMessage(new Request('http://localhost/api/ai-sales/conversations/token/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportToken: 'report-token',
        message: 'What should I fix first?',
      }),
    }), { params: { conversationToken: 'token' } });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'I could not load your assessment context. Please refresh the page or schedule a review.',
    });
  });
});