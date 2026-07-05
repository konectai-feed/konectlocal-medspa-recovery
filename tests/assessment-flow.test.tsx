import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentFlow } from '@/app/(public)/assessment/AssessmentFlow';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildFetchMock(overrides?: Partial<Record<string, Response>>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    const key = `${method} ${url}`;
    if (overrides?.[key]) {
      return overrides[key] as Response;
    }

    if (method === 'POST' && url === '/api/assessment/start') {
      return jsonResponse({ resumeToken: 'resume-token-123' });
    }
    if (method === 'PATCH' && url === '/api/assessment/session') {
      return jsonResponse({ session: {} });
    }
    if (method === 'POST' && url === '/api/assessment/contact') {
      return jsonResponse({ success: true });
    }
    if (method === 'POST' && url === '/api/assessment/complete') {
      return jsonResponse({ reportToken: 'report-123' });
    }
    if (method === 'GET' && url.includes('/api/assessment/session?resumeToken=')) {
      return jsonResponse({ session: { currentStep: 1, answers: {} } });
    }

    return jsonResponse({});
  });
}

async function bootstrapComponent() {
  await waitFor(() => {
    expect(screen.queryByText(/Starting your secure assessment session/i)).toBeNull();
  });
}

async function answerCurrentStep(labels: string[]) {
  for (const label of labels) {
    fireEvent.click(screen.getByLabelText(label));
  }
}

describe('assessment flow', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates required fields before continuing to next step', async () => {
    vi.stubGlobal('fetch', buildFetchMock());
    render(<AssessmentFlow />);

    await bootstrapComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getAllByText('Please choose an answer before continuing.').length).toBeGreaterThan(0);
  });

  it('navigates between steps after required answers are selected', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal('fetch', buildFetchMock());
    render(<AssessmentFlow />);

    await bootstrapComponent();

    await answerCurrentStep([
      'Number of locations - 1 location',
      'Monthly treatment inquiries - Fewer than 25',
      'Average first treatment or package value - Under $250',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inquiry response' })).toBeTruthy();
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Practice profile' })).toBeTruthy();
    });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('uses immediate scrolling when reduced motion is preferred', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });

    vi.stubGlobal('fetch', buildFetchMock());
    render(<AssessmentFlow />);

    await bootstrapComponent();

    await answerCurrentStep([
      'Number of locations - 1 location',
      'Monthly treatment inquiries - Fewer than 25',
      'Average first treatment or package value - Under $250',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inquiry response' })).toBeTruthy();
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('completes the full assessment and redirects to results', async () => {
    vi.stubGlobal('fetch', buildFetchMock());
    render(<AssessmentFlow />);

    await bootstrapComponent();

    await answerCurrentStep([
      'Number of locations - 1 location',
      'Monthly treatment inquiries - Fewer than 25',
      'Average first treatment or package value - Under $250',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inquiry response' })).toBeTruthy();
    });
    await answerCurrentStep([
      'What happens when your team cannot answer a call? - Another person or service answers live',
      'How quickly do website, social, and text inquiries receive a first response? - Under 5 minutes',
      'Do after-hours inquiries receive an immediate response? - Yes, calls and digital inquiries',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Consultation conversion' })).toBeTruthy();
    });
    await answerCurrentStep([
      'Approximately what percentage of treatment inquiries book a consultation or appointment? - 70% or more',
      'What follow-up occurs when an inquiry does not book? - Consistent multi-channel sequence',
      'What is your consultation no-show or late-cancellation rate? - Under 5%',
      'What happens after a consultation no-show or cancellation? - Automated multi-channel rescheduling',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Contact information' })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Meyer' } });
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Glow Spa' } });
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'owner@glowspa.com' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '5555551212' } });
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'glowspa.com' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Austin' } });
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'TX' } });
    fireEvent.click(screen.getByLabelText(/I agree to receive email updates/i));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Patient retention' })).toBeTruthy();
    });
    await answerCurrentStep([
      'How are patients reminded when they are due for another treatment? - Automated and treatment-specific',
      'How often do you run dormant-patient reactivation campaigns? - Monthly or always-on',
      'Does the practice sell memberships, treatment packages, or recurring plans? - Yes, with automated nurture and renewal',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Trust and reporting' })).toBeTruthy();
    });
    await answerCurrentStep([
      'How are review requests sent after a successful visit? - Automated by text and/or email',
      'Can you see the journey from inquiry to consultation, treatment, and return visit? - Yes, in one connected view',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Generate My Results' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/assessment/results/report-123');
    });
  });

  it('shows recoverable API error when session start fails', async () => {
    vi.stubGlobal('fetch', buildFetchMock({
      'POST /api/assessment/start': jsonResponse({ error: 'Rate limit exceeded' }, 429),
    }));

    render(<AssessmentFlow />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    expect(screen.getByText(/Unable to start your assessment session/i)).toBeTruthy();
  });
});
