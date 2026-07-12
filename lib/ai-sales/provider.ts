import { serverEnv } from '@/lib/env.server';
import type { AISalesAssessmentSummary } from '@/lib/ai-sales/context';

export type AISalesMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AISalesReply = {
  reply: string;
  action: 'none' | 'open_checkout' | 'schedule_review' | 'manual_review';
  safe: boolean;
  provider: string;
  model?: string;
};

export type AISalesRequest = {
  message: string;
  messages?: AISalesMessage[];
  leadContext?: {
    leadId?: string;
    assessmentId?: string | null;
    reportToken?: string;
    assessmentSummary?: AISalesAssessmentSummary | null;
  };
};

const moderationKeywords = ['ignore', 'bypass', 'exploit', 'hack', 'attack', 'malware'];
const restrictedTopicKeywords = ['medical', 'clinical', 'hipaa', 'treatment', 'diagnosis', 'phi', 'patient record', 'prescription', 'botox', 'filler'];

function moderateMessage(message: string) {
  const normalized = message.toLowerCase();
  const blocked = moderationKeywords.some((keyword) => normalized.includes(keyword))
    || restrictedTopicKeywords.some((keyword) => normalized.includes(keyword));
  return {
    blocked,
    reason: blocked ? 'Contains restricted content' : undefined,
  };
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return 'custom pricing after review';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function includesAny(message: string, fragments: string[]) {
  return fragments.some((fragment) => message.includes(fragment));
}

function getAction(message: string, summary?: AISalesAssessmentSummary | null): AISalesReply['action'] {
  if (summary && (summary.recommendedPlan.emphasizeReview || !summary.recommendedPlan.checkoutEnabled)) {
    if (includesAny(message, ['activate', 'checkout', 'buy', 'purchase'])) {
      return 'manual_review';
    }

    if (includesAny(message, ['schedule', 'book', 'review', 'next step'])) {
      return 'schedule_review';
    }

    return 'schedule_review';
  }

  if (includesAny(message, ['activate', 'checkout', 'buy', 'purchase'])) {
    return 'open_checkout';
  }

  if (includesAny(message, ['schedule', 'book', 'review'])) {
    return 'schedule_review';
  }

  return 'none';
}

function buildScopeLimitReply() {
  return 'I can only help with your assessment result, revenue leak score, opportunity estimate, recommended recovery plan, activation guidance, and scheduling next steps. I can’t provide medical advice, clinical claims, HIPAA guidance, or treatment recommendations.';
}

function buildInitialReply(summary: AISalesAssessmentSummary) {
  const topLeaks = summary.topRevenueLeaks.slice(0, 3).join(', ');
  const nextStep = summary.recommendedPlan.emphasizeReview || !summary.recommendedPlan.checkoutEnabled
    ? `Direct checkout is disabled for this result, so the best next step is to schedule a revenue recovery review using ${summary.bookingUrl}.`
    : `Your next step is to activate ${summary.recommendedPlan.name} and move into onboarding.`;

  return `${summary.businessName} has a Revenue Leak Score of ${summary.score}/100, which indicates ${summary.recoveryLevel.toLowerCase()}. Your estimated recovery opportunity is ${formatCurrency(summary.opportunityLow)} to ${formatCurrency(summary.opportunityHigh)} per month, or ${formatCurrency(summary.annualImpactLow)} to ${formatCurrency(summary.annualImpactHigh)} annually, with ${summary.confidenceLevel.toLowerCase()} confidence. The biggest revenue leaks showing up right now are ${topLeaks}. ${summary.recommendedPlan.name} was recommended because ${summary.recommendedPlan.explanation.replace(/\.$/, '').toLowerCase()}. ${nextStep}`;
}

function buildRecommendationReply(summary: AISalesAssessmentSummary) {
  return `${summary.recommendedPlan.name} was recommended because ${summary.recommendedPlan.explanation.replace(/\.$/, '').toLowerCase()}. It lines up with the main leaks in ${summary.topRevenueLeaks.slice(0, 2).join(' and ').toLowerCase()} and the size of your current recovery opportunity.`;
}

function buildFixFirstReply(summary: AISalesAssessmentSummary) {
  const [primaryLeak, secondaryLeak] = summary.topRevenueLeaks;
  if (!primaryLeak) {
    return 'Start with the highest-friction part of your lead-to-booking flow, then tighten follow-up and no-show recovery based on what is hardest to track consistently today.';
  }

  return `Fix ${primaryLeak.toLowerCase()} first because it is the largest visible revenue leak in this assessment. After that, address ${secondaryLeak ? secondaryLeak.toLowerCase() : 'your next largest follow-up gap'} to compound the recovery impact.`;
}

function buildOpportunityReply(summary: AISalesAssessmentSummary) {
  return `Your opportunity range is estimated from the business assumptions in the assessment, including inquiry volume, booking rate, no-show rate, average client value, and dormant patient recovery potential. In your current result, that produces an estimate of ${formatCurrency(summary.opportunityLow)} to ${formatCurrency(summary.opportunityHigh)} per month and ${formatCurrency(summary.annualImpactLow)} to ${formatCurrency(summary.annualImpactHigh)} per year.`;
}

function buildActivationReply(summary: AISalesAssessmentSummary) {
  if (summary.recommendedPlan.emphasizeReview || !summary.recommendedPlan.checkoutEnabled) {
    return `This result is routed to a revenue recovery review before purchase. Direct checkout is disabled because the recommended plan needs tailored scoping first. Use ${summary.bookingUrl} to schedule the review, and KonectLocal can walk you through package fit, rollout scope, and onboarding timing.`;
  }

  return `After you activate ${summary.recommendedPlan.name}, the next steps are checkout, onboarding setup, and launch preparation. Pricing on this recommendation is ${formatCurrency(summary.recommendedPlan.monthlyPrice)} per month with a ${formatCurrency(summary.recommendedPlan.setupFee)} setup fee.`;
}

function buildGenericReply(summary: AISalesAssessmentSummary) {
  if (summary.recommendedPlan.emphasizeReview || !summary.recommendedPlan.checkoutEnabled) {
    return `I can explain your score, opportunity estimate, top revenue leaks, and why this result requires a revenue recovery review before activation. If you want to move forward, the next step is scheduling the review at ${summary.bookingUrl}.`;
  }

  return `I can help explain your score, opportunity estimate, top revenue leaks, recommended plan, and what happens after activation. If you want to move forward now, the next step is activating ${summary.recommendedPlan.name}.`;
}

export function createAISalesAdapter(provider = serverEnv.AI_SALES_PROVIDER) {
  return {
    async generateReply(input: AISalesRequest): Promise<AISalesReply> {
      const moderation = moderateMessage(input.message);
      const normalizedMessage = input.message.toLowerCase();
      const summary = input.leadContext?.assessmentSummary;
      if (moderation.blocked) {
        return {
          reply: buildScopeLimitReply(),
          action: 'manual_review',
          safe: false,
          provider,
          model: serverEnv.AI_SALES_MODEL,
        };
      }

      const action = getAction(normalizedMessage, summary);

      if (!summary) {
        return {
          reply: 'I can help explain your assessment result, revenue leak score, opportunity estimate, recommended plan, activation guidance, and next steps.',
          action,
          safe: true,
          provider,
          model: serverEnv.AI_SALES_MODEL,
        };
      }

      const reply = includesAny(normalizedMessage, ['please explain my assessment results', 'explain my assessment', 'recommended recovery plan'])
        ? buildInitialReply(summary)
        : includesAny(normalizedMessage, ['why was this plan recommended', 'why', 'recommended'])
          ? buildRecommendationReply(summary)
          : includesAny(normalizedMessage, ['what should i fix first', 'fix first', 'what should we fix first'])
            ? buildFixFirstReply(summary)
            : includesAny(normalizedMessage, ['how was my opportunity estimated', 'opportunity estimated', 'estimated', 'estimate', 'monthly opportunity', 'annual impact'])
              ? buildOpportunityReply(summary)
              : includesAny(normalizedMessage, ['what happens after i activate', 'after i activate', 'activate', 'checkout', 'purchase', 'buy', 'onboarding'])
                ? buildActivationReply(summary)
                : buildGenericReply(summary);

      return {
        reply,
        action,
        safe: true,
        provider,
        model: serverEnv.AI_SALES_MODEL,
      };
    },
  };
}
