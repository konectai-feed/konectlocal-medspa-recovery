import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverEnv } from '@/lib/env.server';
import { processCheckoutAbandonment } from '@/lib/commerce/abandonment';

const bodySchema = z.object({
  secret: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || parsed.data.secret !== serverEnv.INTEGRATION_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const abandonmentResult = await processCheckoutAbandonment();
  return NextResponse.json({ ok: true, processed: abandonmentResult.processed });
}
