import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { contactCaptureSchema } from '@/lib/assessment/validation';
import { upsertContactForSession } from '@/lib/assessment/service';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';

function hashValue(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`assessment_contact:${ip}`, 5, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } });
  }

  const body = await request.json().catch(() => null);
  const result = contactCaptureSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', details: result.error.flatten() }, { status: 400 });
  }

  try {
    const contact = {
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      businessName: result.data.businessName,
      email: result.data.email,
      phone: result.data.phone,
      website: result.data.website,
      city: result.data.city,
      state: result.data.state,
      consentEmail: result.data.consentEmail,
      consentSms: result.data.consentSms,
    };
    await upsertContactForSession({ token: result.data.resumeToken, contact, utm: result.data.utm, userAgent: request.headers.get('user-agent') ?? undefined, ipHash: hashValue(ip) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
