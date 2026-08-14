import { NextRequest, NextResponse } from 'next/server';
import { runBrevoBootstrap } from '@/scripts/setup-brevo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.INTEGRATION_CRON_SECRET;
  const apiKey = process.env.BREVO_API_KEY;

  if (!expectedSecret || !apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Brevo bootstrap is not configured.' },
      { status: 503 },
    );
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await runBrevoBootstrap({
      apiKey,
      writeGeneratedEnvFile: false,
      logger: console,
    });

    return NextResponse.json({
      ok: true,
      folderId: result.folderId,
      listIds: result.listIds,
      envLines: result.envLines,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brevo bootstrap failed.';
    console.error('Brevo bootstrap failed', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
