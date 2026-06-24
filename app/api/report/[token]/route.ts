import { NextResponse } from 'next/server';
import { fetchReportByToken, createReportViewEvent } from '@/lib/assessment/service';
import { getResultsPageCtaHierarchy } from '@/lib/commerce/results-cta';

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) {
    return NextResponse.json({ error: 'Missing report token' }, { status: 400 });
  }

  const report = await fetchReportByToken(token);
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  await createReportViewEvent(token);
  const answers = (report.assessment.answers ?? {}) as Record<string, unknown>;
  const locationCountRaw = answers.locationCount ?? answers.location_count ?? answers.locations;
  const locationCount = typeof locationCountRaw === 'number' ? locationCountRaw : Number(locationCountRaw ?? 1);
  const cta = getResultsPageCtaHierarchy({ locationCount: Number.isFinite(locationCount) ? locationCount : 1, packageKey: report.assessment.recommended_package });
  return NextResponse.json({ ...report, cta });
}
