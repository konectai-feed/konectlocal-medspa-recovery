export default function CheckoutCancelledPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
      <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Checkout cancelled</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">No charge was made.</h1>
        <p className="mt-4 text-lg text-slate-600">You can return to your results and try the recommended package again whenever you are ready.</p>
      </div>
    </main>
  );
}
