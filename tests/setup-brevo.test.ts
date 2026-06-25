import { describe, expect, it, vi } from 'vitest';
import { AuthFailureError, runBrevoBootstrap } from '@/scripts/setup-brevo';

type MockResponse = {
  status: number;
  body?: unknown;
};

function createFetchMock(sequence: MockResponse[]) {
  let index = 0;
  const calls: { url: string; init?: RequestInit }[] = [];

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const current = sequence[index] ?? sequence[sequence.length - 1];
    index += 1;

    return {
      ok: current.status >= 200 && current.status < 300,
      status: current.status,
      async json() {
        return current.body ?? {};
      },
      async text() {
        return JSON.stringify(current.body ?? {});
      },
    } as Response;
  });

  return { fetchMock, calls };
}

function standardSuccessResponses() {
  return [
    { status: 200, body: { folders: [{ id: 10, name: 'KonectLocal Med Spa Recovery' }] } },
    {
      status: 200,
      body: {
        lists: [
          { id: 101, name: 'Assessment Started' },
          { id: 102, name: 'Assessment Completed' },
          { id: 103, name: 'Assessment Abandoned' },
          { id: 104, name: 'Missed Inquiry Leak' },
          { id: 105, name: 'Consultation Conversion Leak' },
          { id: 106, name: 'No-Show Recovery' },
          { id: 107, name: 'Patient Reactivation' },
          { id: 108, name: 'Revenue Recovery System Qualified' },
          { id: 109, name: 'Command Center Qualified' },
          { id: 110, name: 'Booked Review' },
          { id: 111, name: 'Checkout Abandoned' },
          { id: 112, name: 'Purchased' },
          { id: 113, name: 'Payment Failed' },
          { id: 114, name: 'Suppression' },
          { id: 115, name: 'Onboarding Required' },
          { id: 116, name: 'Onboarding Started' },
          { id: 117, name: 'Onboarding Submitted' },
          { id: 118, name: 'Activation Review' },
          { id: 119, name: 'Configuration' },
          { id: 120, name: 'Ready for Launch' },
          { id: 121, name: 'Active Customers' },
          { id: 122, name: 'Activation Delayed' },
          { id: 123, name: 'Cancelled Customers' },
        ],
      },
    },
    {
      status: 200,
      body: {
        attributes: {
          normal: [
            { name: 'BUSINESS_NAME', type: 'text' },
            { name: 'WEBSITE', type: 'text' },
            { name: 'CITY', type: 'text' },
            { name: 'STATE', type: 'text' },
            { name: 'RECOVERY_LEVEL', type: 'text' },
            { name: 'PRIMARY_LEAK', type: 'text' },
            { name: 'SECONDARY_LEAK', type: 'text' },
            { name: 'THIRD_LEAK', type: 'text' },
            { name: 'RECOMMENDED_PACKAGE', type: 'text' },
            { name: 'REPORT_URL', type: 'text' },
            { name: 'LEAD_SOURCE', type: 'text' },
            { name: 'CAMPAIGN_VARIANT', type: 'text' },
            { name: 'ASSESSMENT_STATUS', type: 'text' },
            { name: 'BOOKING_STATUS', type: 'text' },
            { name: 'CUSTOMER_STATUS', type: 'text' },
            { name: 'FORMULA_VERSION', type: 'text' },
            { name: 'CONFIDENCE_LEVEL', type: 'text' },
            { name: 'STRIPE_CUSTOMER_ID', type: 'text' },
            { name: 'SUBSCRIPTION_STATUS', type: 'text' },
            { name: 'PROMOTION_CODE', type: 'text' },
            { name: 'PURCHASED_PACKAGE', type: 'text' },
            { name: 'ACTIVATION_STATUS', type: 'text' },
            { name: 'ONBOARDING_STATUS', type: 'text' },
            { name: 'RECOVERY_SCORE', type: 'float' },
            { name: 'OPPORTUNITY_LOW', type: 'float' },
            { name: 'OPPORTUNITY_HIGH', type: 'float' },
            { name: 'LOCATION_COUNT', type: 'float' },
            { name: 'MONTHLY_INQUIRIES', type: 'float' },
            { name: 'SALES_READINESS_SCORE', type: 'float' },
            { name: 'ACCOUNT_VALUE_SCORE', type: 'float' },
            { name: 'ONBOARDING_COMPLETION_PERCENT', type: 'float' },
            { name: 'LAST_ASSESSMENT_DATE', type: 'date' },
            { name: 'LAUNCH_DATE', type: 'date' },
            { name: 'PREVIOUS_CAMPAIGN_OPENER', type: 'boolean' },
            { name: 'MANUAL_REVIEW_REQUIRED', type: 'boolean' },
          ],
        },
      },
    },
  ];
}

describe('setup-brevo bootstrap', () => {
  it('reuses an existing folder', async () => {
    const { fetchMock, calls } = createFetchMock(standardSuccessResponses());

    const result = await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });

    expect(result.folderId).toBe(10);
    expect(calls.some((call) => call.url.endsWith('/contacts/folders') && call.init?.method === 'POST')).toBe(false);
  });

  it('creates folder when missing', async () => {
    const { fetchMock, calls } = createFetchMock([
      { status: 200, body: { folders: [] } },
      { status: 201, body: { id: 20 } },
      ...standardSuccessResponses().slice(1),
    ]);

    const result = await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });

    expect(result.folderId).toBe(20);
    expect(calls.some((call) => call.url.endsWith('/contacts/folders') && call.init?.method === 'POST')).toBe(true);
  });

  it('reuses existing lists', async () => {
    const { fetchMock, calls } = createFetchMock(standardSuccessResponses());
    await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });
    expect(calls.some((call) => call.url.endsWith('/contacts/lists') && call.init?.method === 'POST')).toBe(false);
  });

  it('creates missing lists', async () => {
    const { fetchMock, calls } = createFetchMock([
      { status: 200, body: { folders: [{ id: 10, name: 'KonectLocal Med Spa Recovery' }] } },
      { status: 200, body: { lists: [{ id: 101, name: 'Assessment Started' }] } },
      ...Array.from({ length: 22 }, (_v, i) => ({ status: 201, body: { id: 200 + i } })),
      standardSuccessResponses()[2],
    ]);

    await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });
    expect(calls.filter((call) => call.url.endsWith('/contacts/lists') && call.init?.method === 'POST').length).toBe(22);
  });

  it('reuses existing attributes', async () => {
    const { fetchMock, calls } = createFetchMock(standardSuccessResponses());
    await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });
    expect(calls.some((call) => call.url.includes('/contacts/attributes/normal/') && call.init?.method === 'POST')).toBe(false);
  });

  it('creates missing attributes', async () => {
    const { fetchMock, calls } = createFetchMock([
      standardSuccessResponses()[0],
      standardSuccessResponses()[1],
      { status: 200, body: { attributes: { normal: [] } } },
      ...Array.from({ length: 35 }, () => ({ status: 201, body: {} })),
    ]);

    await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });
    expect(calls.filter((call) => call.url.includes('/contacts/attributes/normal/') && call.init?.method === 'POST').length).toBe(35);
  });

  it('fails on incompatible attribute types', async () => {
    const { fetchMock } = createFetchMock([
      standardSuccessResponses()[0],
      standardSuccessResponses()[1],
      { status: 200, body: { attributes: { normal: [{ name: 'RECOVERY_SCORE', type: 'text' }] } } },
    ]);

    await expect(
      runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } }),
    ).rejects.toThrow('Attribute type mismatch for RECOVERY_SCORE');
  });

  it('supports pagination while listing folders and lists', async () => {
    const { fetchMock, calls } = createFetchMock([
      { status: 200, body: { folders: Array.from({ length: 50 }, (_v, i) => ({ id: i + 1, name: `Folder ${i}` })) } },
      { status: 200, body: { folders: [{ id: 10, name: 'KonectLocal Med Spa Recovery' }] } },
      { status: 200, body: { lists: Array.from({ length: 50 }, (_v, i) => ({ id: i + 1, name: `List ${i}` })) } },
      { status: 200, body: { lists: standardSuccessResponses()[1].body?.lists } },
      standardSuccessResponses()[2],
    ]);

    await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });

    expect(calls.some((call) => call.url.includes('/contacts/folders?limit=50&offset=50'))).toBe(true);
    expect(calls.some((call) => call.url.includes('/contacts/lists?limit=50&offset=50'))).toBe(true);
  });

  it('retries 429 responses with exponential backoff', async () => {
    const sleep = vi.fn(async () => undefined);
    const { fetchMock } = createFetchMock([
      { status: 429, body: { code: 'rate_limit' } },
      ...standardSuccessResponses(),
    ]);

    await runBrevoBootstrap({
      apiKey: 'test-key',
      fetchFn: fetchMock as unknown as typeof fetch,
      sleepFn: sleep,
      logger: { log: vi.fn(), error: vi.fn() },
      retry: { maxRetries: 2, baseDelayMs: 10 },
    });

    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('stops on authentication failure', async () => {
    const { fetchMock } = createFetchMock([{ status: 401, body: { message: 'unauthorized' } }]);
    await expect(
      runBrevoBootstrap({ apiKey: 'bad-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } }),
    ).rejects.toBeInstanceOf(AuthFailureError);
  });

  it('returns environment-variable output lines', async () => {
    const { fetchMock } = createFetchMock(standardSuccessResponses());
    const result = await runBrevoBootstrap({ apiKey: 'test-key', fetchFn: fetchMock as unknown as typeof fetch, logger: { log: vi.fn(), error: vi.fn() } });

    expect(result.envLines.some((line) => line.startsWith('BREVO_LIST_ASSESSMENT_STARTED='))).toBe(true);
    expect(result.envLines.some((line) => line.startsWith('BREVO_LIST_ACTIVE_CUSTOMERS='))).toBe(true);
  });
});
