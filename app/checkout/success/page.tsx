export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Checkout complete</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Your purchase is being processed.</h1>
        <p className="mt-4 text-lg text-slate-600">We will confirm the package and onboarding steps once the payment is verified.</p>
      </div>
    </main>
  );
}
