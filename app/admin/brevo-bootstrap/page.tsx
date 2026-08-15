'use client';

import { FormEvent, useState } from 'react';

type BootstrapResponse = {
  ok: boolean;
  error?: string;
  folderId?: number;
  listIds?: Record<string, number>;
  envLines?: string[];
};

export default function BrevoBootstrapPage() {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BootstrapResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/brevo/bootstrap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      });

      const data = (await response.json()) as BootstrapResponse;
      setResult(data);
      if (data.ok) setSecret('');
    } catch {
      setResult({ ok: false, error: 'Request failed. Check the deployment logs and try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 30, marginBottom: 10 }}>Brevo Bootstrap</h1>
      <p style={{ lineHeight: 1.5, marginBottom: 24 }}>
        One-time KonectLocal setup. Enter the Vercel <code>INTEGRATION_CRON_SECRET</code>. The secret is sent only to this app over HTTPS and is not stored by this page.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label htmlFor="secret" style={{ fontWeight: 600 }}>Integration secret</label>
        <input
          id="secret"
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          required
          minLength={16}
          style={{ fontSize: 18, padding: 14, border: '1px solid #999', borderRadius: 8 }}
        />
        <button
          type="submit"
          disabled={loading || !secret}
          style={{ fontSize: 18, padding: 14, borderRadius: 8, border: 0, cursor: 'pointer' }}
        >
          {loading ? 'Running Brevo setup…' : 'Run Brevo Setup'}
        </button>
      </form>

      {result && (
        <section style={{ marginTop: 28, padding: 18, border: '1px solid #bbb', borderRadius: 10 }}>
          <h2 style={{ marginTop: 0 }}>{result.ok ? 'Setup complete' : 'Setup failed'}</h2>
          {result.error && <p>{result.error}</p>}
          {result.ok && (
            <>
              <p>Brevo folder ID: <strong>{result.folderId}</strong></p>
              <p>Created/reused {Object.keys(result.listIds ?? {}).length} lifecycle lists.</p>
              <p style={{ fontWeight: 600 }}>Next Vercel environment variables:</p>
              <textarea
                readOnly
                value={(result.envLines ?? []).join('\n')}
                rows={Math.min(24, Math.max(6, result.envLines?.length ?? 6))}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, padding: 12, boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 13, opacity: 0.75 }}>
                These are list IDs, not API secrets. Keep this page open until they are saved in Vercel.
              </p>
            </>
          )}
        </section>
      )}
    </main>
  );
}
