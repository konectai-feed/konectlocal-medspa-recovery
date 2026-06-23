import { NextResponse } from 'next/server';
import { fetchReportByToken, createReportViewEvent } from '@/lib/assessment/service';

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
  return NextResponse.json(report);
}
