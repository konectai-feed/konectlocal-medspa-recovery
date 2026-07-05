import { AssessmentFlow } from './AssessmentFlow';

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-soft-background">
      <section className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-recovery-green">KonectLocal Assessment</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy md:text-5xl">
          Calculate Your Revenue Recovery Opportunity
        </h1>
        <p className="mt-4 max-w-3xl text-base text-navy-secondary md:text-lg">
          This diagnostic evaluates inquiry handling, conversion, retention, and reporting for med spa businesses.
          We never request patient records, medical information, PHI, passwords, or payment-card data.
        </p>
        <div className="mt-8">
          <AssessmentFlow />
        </div>
      </section>
    </main>
  );
}
