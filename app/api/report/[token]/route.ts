import { NextResponse } from 'next/server';
import { fetchReportByToken, createReportViewEvent } from '@/lib/assessment/service';
import { buildAssessmentReportPresentation, getLocationCountFromAnswers } from '@/lib/assessment/report';
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
  const locationCount = getLocationCountFromAnswers(answers);
  const cta = getResultsPageCtaHierarchy({ locationCount, packageKey: String(report.assessment.recommended_package ?? '') });
  const presentation = buildAssessmentReportPresentation({
    assessment: report.assessment as Record<string, unknown>,
    lead: report.lead as Record<string, unknown>,
    cta,
    bookingUrl: process.env.BOOKING_URL,
  });
  return NextResponse.json({ ...report, cta, presentation });
}
