'use client';

import React from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const aiDiscussionStarter = 'Please explain my assessment results and recommended recovery plan.';

const suggestedQuestions = [
  'Why was this plan recommended?',
  'What should I fix first?',
  'How was my opportunity estimated?',
  'What happens after I activate?',
] as const;

type ReportResponse = {
  assessment: {
    recommended_package: string;
    calculation_snapshot?: {
      assumptions?: {
        inquiries?: number;
        value?: number;
        bookingRate?: number;
        noShowRate?: number;
        dormantPool?: number;
      };
    };
  };
  lead: {
    id: string;
    business_name: string;
  };
  cta: {
    primary: 'purchase' | 'manual_review' | 'booking';
    secondary: 'ai_sales_chat' | 'booking' | 'purchase' | 'manual_review' | null;
    tertiary: 'booking' | 'ai_sales_chat' | 'purchase' | 'manual_review' | null;
  };
  presentation: {
    score: number;
    recoveryLevel: string;
    opportunityLow: number;
    opportunityHigh: number;
    annualImpactLow: number;
    annualImpactHigh: number;
    confidenceLevel: string;
    confidenceExplanation: string;
    confidenceDisclaimer: string;
    assumptionsUsed: {
      monthlyInquiries: number;
      averageClientValue: number;
      bookingRate: number;
      noShowRate: number;
      dormantPatientPool: number;
    };
    topRevenueLeaks: Array<{
      key: string;
      label: string;
      severityLabel: string;
      severityPercent: number;
    }>;
    positiveFindings: string[];
    recommendedPackage: {
      slug: string;
      name: string;
      monthlyPrice: number | null;
      setupFee: number | null;
      explanation: string;
      checkoutEnabled: boolean;
      emphasizeReview: boolean;
    };
    bookingUrl: string;
    leadId: string;
    assessmentId: string;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSeverity(value: number) {
  return `${value}%`;
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-navy-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold text-navy">{value}</p>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-navy">{title}</h2>
          {description ? <p className="mt-1 text-sm text-navy-secondary">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AssessmentResultsPage({ params }: { params: { token: string } }) {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [monthlyInquiries, setMonthlyInquiries] = useState('');
  const [averageValue, setAverageValue] = useState('');
  const [bookingRate, setBookingRate] = useState('');
  const [noShowRate, setNoShowRate] = useState('');
  const [dormantPool, setDormantPool] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState('AI chat is ready.');
  const [conversationToken, setConversationToken] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const syncAssumptionInputs = useCallback((nextReport: ReportResponse) => {
    const assumptions = nextReport.presentation.assumptionsUsed;
    setMonthlyInquiries(String(assumptions.monthlyInquiries));
    setAverageValue(String(assumptions.averageClientValue));
    setBookingRate(String(Math.round(assumptions.bookingRate * 100)));
    setNoShowRate(String(Math.round(assumptions.noShowRate * 100)));
    setDormantPool(String(assumptions.dormantPatientPool));
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/report/${params.token}`);
      const json = await response.json().catch(() => null);
      if (!response.ok || !json) {
        throw new Error((json as { error?: string } | null)?.error ?? 'Unable to load report');
      }
      const nextReport = json as ReportResponse;
      setReport(nextReport);
      syncAssumptionInputs(nextReport);
    } finally {
      setLoading(false);
    }
  }, [params.token, syncAssumptionInputs]);

  useEffect(() => {
    let mounted = true;

    async function loadCurrentReport() {
      try {
        await loadReport();
        if (!mounted) {
          return;
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError((loadError as Error).message);
      }
    }

    void loadCurrentReport();

    return () => {
      mounted = false;
    };
  }, [loadReport]);

  useEffect(() => {
    setChatMessages([]);
    setChatInput('');
    setChatError(null);
    setChatLoading(false);
    setChatStatus('AI chat is ready.');
    setConversationToken(null);
  }, [params.token]);

  const applyAssumptionEdits = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { reportToken: params.token };
      if (monthlyInquiries) payload.monthlyInquiries = Number(monthlyInquiries);
      if (averageValue) payload.averageValue = Number(averageValue);
      if (bookingRate) payload.bookingRate = Number(bookingRate) / 100;
      if (noShowRate) payload.noShowRate = Number(noShowRate) / 100;
      if (dormantPool) payload.dormantPool = Number(dormantPool);

      const recalcResponse = await fetch('/api/assessment/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const recalcJson = await recalcResponse.json().catch(() => null);
      if (!recalcResponse.ok || !recalcJson) {
        throw new Error((recalcJson as { error?: string } | null)?.error ?? 'Unable to recalculate');
      }
      await loadReport();
    } catch (recalcError) {
      setError((recalcError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!report) {
      return;
    }
    setCheckoutLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportToken: params.token,
          packageKey: report.presentation.recommendedPackage.slug,
          source: 'results_page',
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.checkoutUrl) {
        throw new Error((json as { error?: string } | null)?.error ?? 'Unable to start checkout');
      }
      window.location.assign(String(json.checkoutUrl));
    } catch (checkoutError) {
      setError((checkoutError as Error).message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const sendChatMessage = useCallback(async (message: string) => {
    const trimmedMessage = message.trim();
    if (!report || !trimmedMessage || chatLoading) {
      return;
    }

    const visibleMessages = [...chatMessages, { role: 'user' as const, content: trimmedMessage }];
    const startingConversation = !conversationToken;

    setChatLoading(true);
    setChatError(null);
    setChatStatus(startingConversation ? 'Starting AI discussion...' : 'Sending follow-up question...');

    try {
      const response = await fetch(startingConversation ? '/api/ai-sales/conversations' : `/api/ai-sales/conversations/${conversationToken}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: report.presentation.leadId,
          assessmentId: report.presentation.assessmentId,
          reportToken: params.token,
          messages: visibleMessages,
          message: trimmedMessage,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.reply) {
        throw new Error((json as { error?: string } | null)?.error ?? 'Unable to send AI message');
      }

      if (startingConversation && typeof json.conversationToken === 'string') {
        setConversationToken(json.conversationToken);
      }

      setChatMessages((currentMessages) => [
        ...currentMessages,
        { role: 'user', content: trimmedMessage },
        { role: 'assistant', content: String(json.reply) },
      ]);
      setChatInput('');
      setChatStatus('AI response added to chat history.');
    } catch (aiError) {
      setChatError((aiError as Error).message);
      setChatStatus('AI chat failed to respond.');
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, chatMessages, conversationToken, params.token, report]);

  const handleDiscussWithAi = useCallback(async () => {
    await sendChatMessage(aiDiscussionStarter);
  }, [sendChatMessage]);

  const handleSuggestedQuestion = useCallback(async (question: string) => {
    await sendChatMessage(question);
  }, [sendChatMessage]);

  const handleChatSubmit = useCallback(async () => {
    await sendChatMessage(chatInput);
  }, [chatInput, sendChatMessage]);

  const ctaActions = useMemo(() => {
    if (!report) {
      return [] as Array<'purchase' | 'manual_review' | 'booking' | 'ai_sales_chat'>;
    }
    return [report.cta.primary, report.cta.secondary, report.cta.tertiary].filter(Boolean) as Array<'purchase' | 'manual_review' | 'booking' | 'ai_sales_chat'>;
  }, [report]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
        <p role="status" aria-live="polite">Loading your report...</p>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
        <div className="rounded-xl border border-critical-red/40 bg-critical-red/10 p-4" role="alert">
          <p>{error ?? 'Unable to load report.'}</p>
        </div>
      </main>
    );
  }

  const { presentation } = report;
  const monthlyRange = `${formatCurrency(presentation.opportunityLow)} - ${formatCurrency(presentation.opportunityHigh)}`;
  const annualRange = `${formatCurrency(presentation.annualImpactLow)} - ${formatCurrency(presentation.annualImpactHigh)}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(71,179,166,0.14),_transparent_35%),linear-gradient(180deg,_#f8fbfc_0%,_#eef5f7_100%)]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_24px_80px_rgba(12,42,64,0.08)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-recovery-green">Assessment results</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy md:text-5xl">{report.lead.business_name}</h1>
              <p className="mt-3 max-w-2xl text-base text-navy-secondary">These estimates are directional and not guaranteed.</p>
            </div>
            <div className="rounded-2xl bg-navy px-6 py-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Revenue Leak Score</p>
              <p className="mt-2 text-4xl font-bold">{presentation.score}/100</p>
              <p className="mt-2 max-w-xs text-sm text-white/80">Higher scores indicate more revenue leakage and operational recovery opportunity.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <LabelValue label="Recovery Level" value={presentation.recoveryLevel} />
            <LabelValue label="Estimated Monthly Recovery Opportunity" value={monthlyRange} />
            <LabelValue label="Estimated Annual Impact" value={annualRange} />
            <LabelValue label="Estimate Confidence" value={presentation.confidenceLevel} />
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <SectionCard title="Estimate Confidence" description={presentation.confidenceExplanation}>
              <p className="text-sm text-navy-secondary">{presentation.confidenceDisclaimer}</p>
            </SectionCard>

            <SectionCard title="Top Revenue Leaks" description="These are the areas creating the largest recovery opportunity right now.">
              <div className="grid gap-4 md:grid-cols-3">
                {presentation.topRevenueLeaks.map((leak) => (
                  <article key={leak.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-navy-secondary">{leak.severityLabel}</p>
                    <h3 className="mt-2 text-lg font-semibold text-navy">{leak.label}</h3>
                    <p className="mt-2 text-sm text-navy-secondary">Estimated leakage pressure: {formatSeverity(leak.severityPercent)}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Positive Findings" description="These strengths can make recovery faster once the biggest leaks are addressed.">
              <div className="grid gap-3 md:grid-cols-3">
                {presentation.positiveFindings.map((finding) => (
                  <div key={finding} className="rounded-2xl border border-recovery-green/20 bg-recovery-green/5 p-4 text-sm text-navy">
                    {finding}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Assumptions Used" description="These are the actual business assumptions used in the current estimate.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <LabelValue label="Monthly Inquiries" value={String(presentation.assumptionsUsed.monthlyInquiries)} />
                <LabelValue label="Average Client Value" value={formatCurrency(presentation.assumptionsUsed.averageClientValue)} />
                <LabelValue label="Booking Rate" value={formatPercent(presentation.assumptionsUsed.bookingRate)} />
                <LabelValue label="No-show Rate" value={formatPercent(presentation.assumptionsUsed.noShowRate)} />
                <LabelValue label="Dormant Patient Pool" value={String(presentation.assumptionsUsed.dormantPatientPool)} />
              </div>
            </SectionCard>

            <SectionCard title="Adjust Assumptions" description="Update the business inputs below to run a what-if scenario.">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-navy">Monthly inquiries<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={1} max={5000} value={monthlyInquiries} onChange={(event) => setMonthlyInquiries(event.target.value)} /></label>
                <label className="text-sm font-medium text-navy">Average client value (USD)<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={50} max={10000} value={averageValue} onChange={(event) => setAverageValue(event.target.value)} /></label>
                <label className="text-sm font-medium text-navy">Booking rate (%)<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={10} max={100} value={bookingRate} onChange={(event) => setBookingRate(event.target.value)} /></label>
                <label className="text-sm font-medium text-navy">No-show rate (%)<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={0} max={100} value={noShowRate} onChange={(event) => setNoShowRate(event.target.value)} /></label>
                <label className="text-sm font-medium text-navy md:col-span-2">Dormant patient pool<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" type="number" min={50} max={1500} value={dormantPool} onChange={(event) => setDormantPool(event.target.value)} /></label>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => { void applyAssumptionEdits(); }} disabled={saving}>{saving ? 'Recalculating...' : 'Recalculate Opportunity'}</Button>
                <p className="text-sm text-navy-secondary">The refreshed estimate updates monthly opportunity, annual impact, and estimate confidence.</p>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-8">
            <SectionCard title="Recommended Recovery Plan" description={presentation.recommendedPackage.explanation}>
              <div className="rounded-3xl bg-navy p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Recommended plan</p>
                <h3 className="mt-2 text-2xl font-bold">{presentation.recommendedPackage.name}</h3>
                <p className="mt-3 text-sm text-white/80">{presentation.recommendedPackage.emphasizeReview ? 'A tailored review is recommended before activating a package.' : 'Built for med spas that want to recover more booked revenue without adding manual follow-up.'}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">Monthly price</p>
                    <p className="mt-2 text-xl font-semibold">{presentation.recommendedPackage.monthlyPrice === null ? 'Custom after review' : formatCurrency(presentation.recommendedPackage.monthlyPrice) + '/month'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60">Setup fee</p>
                    <p className="mt-2 text-xl font-semibold">{presentation.recommendedPackage.setupFee === null ? 'Included in review' : formatCurrency(presentation.recommendedPackage.setupFee)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {ctaActions.includes('purchase') && presentation.recommendedPackage.checkoutEnabled ? (
                  <Button type="button" className="w-full" disabled={checkoutLoading} onClick={() => { void handleCheckout(); }}>
                    {checkoutLoading ? 'Opening checkout...' : 'Activate My Recommended Plan'}
                  </Button>
                ) : null}
                {chatMessages.length === 0 ? (
                  <Button type="button" variant="outline" className="w-full" disabled={chatLoading} onClick={() => { void handleDiscussWithAi(); }}>
                    {chatLoading ? 'Starting AI discussion...' : 'Discuss My Results With AI'}
                  </Button>
                ) : null}
                <Button asChild type="button" variant="outline" className="w-full border-slate-300 bg-white text-navy hover:bg-slate-50">
                  <Link href={presentation.bookingUrl}>Schedule Revenue Recovery Review</Link>
                </Button>
              </div>

              <div className="mt-5 rounded-2xl border border-aqua/30 bg-aqua/10 p-4 text-sm text-navy">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">AI explanation chat</p>
                    <p className="mt-2 text-navy-secondary">Ask follow-up questions about your assessment result, revenue leak score, opportunity estimate, recommended plan, activation flow, or next steps. KonectLocal AI does not provide medical advice or treatment guidance.</p>
                  </div>
                </div>

                <p className="sr-only" role="status" aria-live="polite">{chatStatus}</p>

                <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-navy-secondary">Start the conversation to get an AI walkthrough of your results and recovery plan.</p>
                  ) : (
                    <div className="space-y-3" role="log" aria-live="polite" aria-relevant="additions text">
                      {chatMessages.map((message, index) => (
                        <div key={`${message.role}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'assistant' ? 'bg-aqua/20 text-navy' : 'bg-navy text-white'}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-70">{message.role === 'assistant' ? 'KonectLocal AI' : 'You'}</p>
                            <p className="mt-2 whitespace-pre-line">{message.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {chatLoading ? (
                    <p className="mt-3 text-sm text-navy-secondary" role="status" aria-live="polite">KonectLocal AI is drafting a response...</p>
                  ) : null}

                  {chatError ? (
                    <div className="mt-3 rounded-xl border border-critical-red/30 bg-critical-red/10 p-3 text-sm text-critical-red" role="alert">
                      {chatError}
                    </div>
                  ) : null}
                </div>

                {chatMessages.length > 0 ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {suggestedQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          className="rounded-full border border-aqua/40 bg-white px-3 py-2 text-sm font-medium text-navy transition hover:border-aqua hover:bg-aqua/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={chatLoading}
                          onClick={() => {
                            void handleSuggestedQuestion(question);
                          }}
                        >
                          {question}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <label className="sr-only" htmlFor="results-ai-chat-input">Ask KonectLocal AI a follow-up question</label>
                      <input
                        id="results-ai-chat-input"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-navy shadow-sm focus:border-aqua focus:outline-none focus:ring-2 focus:ring-aqua/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                        type="text"
                        value={chatInput}
                        placeholder="Ask a follow-up question about your results or next steps"
                        disabled={chatLoading}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleChatSubmit();
                          }
                        }}
                      />
                      <Button type="button" className="sm:w-auto" disabled={chatLoading || chatInput.trim().length === 0} onClick={() => { void handleChatSubmit(); }}>
                        {chatLoading ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </div>
      </section>
    </main>
  );
}
