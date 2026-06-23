import { NextResponse } from 'next/server';
import { assessmentRecalculateSchema } from '@/lib/assessment/validation';
import { recalculateAssessmentByReportToken } from '@/lib/assessment/service';
import { checkRateLimit, getRequestIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`assessment_recalculate:${ip}`, 20, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } });
  }

  const body = await request.json().catch(() => null);
  const result = assessmentRecalculateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', details: result.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await recalculateAssessmentByReportToken(result.data.reportToken, {
      monthlyInquiries: result.data.monthlyInquiries,
      averageValue: result.data.averageValue,
      bookingRate: result.data.bookingRate,
      noShowRate: result.data.noShowRate,
      dormantPool: result.data.dormantPool,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
