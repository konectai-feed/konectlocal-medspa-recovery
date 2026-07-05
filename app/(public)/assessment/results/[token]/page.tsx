'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type ReportResponse = {
  assessment: {
    recovery_score: number;
    recovery_level: string;
    opportunity_low: number;
    opportunity_high: number;
    confidence_level: string;
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
    business_name: string;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-navy-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold text-navy">{value}</p>
    </div>
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

  useEffect(() => {
    let mounted = true;

    async function loadReport() {
      try {
        setLoading(true);
        const response = await fetch(`/api/report/${params.token}`);
        const json = await response.json().catch(() => null);
        if (!response.ok || !json) {
          throw new Error((json as { error?: string } | null)?.error ?? 'Unable to load report');
        }
        if (!mounted) {
          return;
        }
        setReport(json as ReportResponse);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError((loadError as Error).message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      mounted = false;
    };
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

      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assessment: {
            ...prev.assessment,
            recovery_score: recalcJson.recoveryScore,
            recovery_level: recalcJson.recoveryLevel,
            opportunity_low: recalcJson.opportunityLow,
            opportunity_high: recalcJson.opportunityHigh,
            confidence_level: recalcJson.confidenceLevel,
            recommended_package: recalcJson.recommendedPackage,
          },
        };
      });
    } catch (recalcError) {
      setError((recalcError as Error).message);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <main className="min-h-screen bg-soft-background">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-recovery-green">Assessment results</p>
        <h1 className="mt-2 text-3xl font-bold text-navy md:text-4xl">{report.lead.business_name}</h1>
        <p className="mt-3 max-w-2xl text-navy-secondary">These estimates are directional and not guaranteed.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LabelValue label="Recovery score" value={String(report.assessment.recovery_score)} />
          <LabelValue label="Recovery level" value={report.assessment.recovery_level} />
          <LabelValue label="Opportunity range" value={`${formatCurrency(report.assessment.opportunity_low)} - ${formatCurrency(report.assessment.opportunity_high)}`} />
          <LabelValue label="Confidence" value={report.assessment.confidence_level} />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-navy">Adjust assumptions</h2>
          <p className="mt-2 text-sm text-navy-secondary">Optional: update assumptions to run a what-if scenario.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">Monthly inquiries<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min={1} max={5000} value={monthlyInquiries} onChange={(event) => setMonthlyInquiries(event.target.value)} /></label>
            <label className="text-sm">Average value (USD)<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min={50} max={10000} value={averageValue} onChange={(event) => setAverageValue(event.target.value)} /></label>
            <label className="text-sm">Booking rate (%)<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min={10} max={100} value={bookingRate} onChange={(event) => setBookingRate(event.target.value)} /></label>
            <label className="text-sm">No-show rate (%)<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min={0} max={100} value={noShowRate} onChange={(event) => setNoShowRate(event.target.value)} /></label>
            <label className="text-sm md:col-span-2">Dormant patient pool<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min={50} max={1500} value={dormantPool} onChange={(event) => setDormantPool(event.target.value)} /></label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="button" onClick={() => { void applyAssumptionEdits(); }} disabled={saving}>{saving ? 'Recalculating...' : 'Recalculate opportunity'}</Button>
            <p className="text-sm text-navy-secondary">Recommended package: {report.assessment.recommended_package}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
