'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  assessmentQuestionLabels,
  assessmentQuestionOptions,
  consentText,
} from '@/lib/assessment/config';
import type { AssessmentAnswerKey } from '@/lib/assessment/types';

type StepDefinition = {
  id: number;
  label: string;
  questionKeys?: AssessmentAnswerKey[];
  isContact?: boolean;
};

type AnswersState = Partial<Record<AssessmentAnswerKey, string>>;

type ContactState = {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  consentEmail: boolean;
  consentSms: boolean;
};

const RESUME_TOKEN_STORAGE_KEY = 'assessment_resume_token';

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    id: 1,
    label: 'Practice profile',
    questionKeys: ['location_count_band', 'monthly_inquiry_band', 'average_value_band'],
  },
  {
    id: 2,
    label: 'Inquiry response',
    questionKeys: ['missed_call_handling', 'digital_response_time', 'after_hours_coverage'],
  },
  {
    id: 3,
    label: 'Consultation conversion',
    questionKeys: [
      'inquiry_booking_rate_band',
      'unbooked_lead_followup',
      'no_show_rate_band',
      'missed_appointment_recovery',
    ],
  },
  {
    id: 4,
    label: 'Contact information',
    isContact: true,
  },
  {
    id: 5,
    label: 'Patient retention',
    questionKeys: ['treatment_recall_process', 'reactivation_process', 'membership_package_maturity'],
  },
  {
    id: 6,
    label: 'Trust and reporting',
    questionKeys: ['review_request_process', 'reporting_visibility'],
  },
];

const INITIAL_CONTACT_STATE: ContactState = {
  firstName: '',
  lastName: '',
  businessName: '',
  email: '',
  phone: '',
  website: '',
  city: '',
  state: '',
  consentEmail: false,
  consentSms: false,
};

function getUtmData() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const params = new URLSearchParams(window.location.search);
  const entries = Array.from(params.entries()).filter(([key]) => key.toLowerCase().startsWith('utm_'));
  if (!entries.length) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function AssessmentFlow() {
  const router = useRouter();
  const cardRef = useRef<HTMLElement | null>(null);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [contact, setContact] = useState<ContactState>(INITIAL_CONTACT_STATE);
  const [stepIndex, setStepIndex] = useState(0);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currentStep = STEP_DEFINITIONS[stepIndex];
  const isLastStep = stepIndex === STEP_DEFINITIONS.length - 1;

  const scrollToAssessmentTop = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (typeof cardRef.current?.scrollIntoView === 'function') {
        cardRef.current.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
  }, []);

  const saveSessionPatch = useCallback(
    async (payload: { answers?: Record<string, string>; currentStep?: number; completedStep?: number }) => {
      if (!resumeToken) {
        return;
      }
      setIsSaving(true);
      const response = await fetch('/api/assessment/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeToken, ...payload }),
      });
      setIsSaving(false);
      if (!response.ok) {
        const json = await safeJson<{ error?: string }>(response);
        throw new Error(json?.error ?? 'Unable to save assessment progress');
      }
    },
    [resumeToken],
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrapAssessment() {
      try {
        setIsBootstrapping(true);
        setErrorMessage(null);

        const storedToken = typeof window !== 'undefined' ? localStorage.getItem(RESUME_TOKEN_STORAGE_KEY) : null;
        if (storedToken) {
          const response = await fetch(`/api/assessment/session?resumeToken=${encodeURIComponent(storedToken)}`);
          if (response.ok) {
            const json = await safeJson<{ session: { answers?: Record<string, string>; currentStep?: number } }>(response);
            if (!mounted) {
              return;
            }
            setResumeToken(storedToken);
            setAnswers((json?.session?.answers ?? {}) as AnswersState);
            const resumeStep = Math.min(Math.max((json?.session?.currentStep ?? 1) - 1, 0), STEP_DEFINITIONS.length - 1);
            setStepIndex(resumeStep);
            return;
          }
          localStorage.removeItem(RESUME_TOKEN_STORAGE_KEY);
        }

        const utm = getUtmData();
        const startResponse = await fetch('/api/assessment/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utm,
            attribution: typeof document !== 'undefined' && document.referrer ? { referrer: document.referrer } : undefined,
          }),
        });

        const startJson = await safeJson<{ resumeToken?: string }>(startResponse);
        if (!startResponse.ok || !startJson?.resumeToken) {
          throw new Error('Unable to start your assessment session. Please retry.');
        }

        if (!mounted) {
          return;
        }
        setResumeToken(startJson.resumeToken);
        localStorage.setItem(RESUME_TOKEN_STORAGE_KEY, startJson.resumeToken);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setErrorMessage((error as Error).message);
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapAssessment();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isBootstrapping) {
      scrollToAssessmentTop();
    }
  }, [isBootstrapping, scrollToAssessmentTop, stepIndex]);

  const validateCurrentStep = useCallback(() => {
    const nextErrors: Record<string, string> = {};

    if (currentStep.questionKeys) {
      for (const key of currentStep.questionKeys) {
        if (!answers[key]) {
          nextErrors[key] = 'Please choose an answer before continuing.';
        }
      }
    }

    if (currentStep.isContact) {
      if (!contact.firstName.trim()) nextErrors.firstName = 'First name is required.';
      if (!contact.lastName.trim()) nextErrors.lastName = 'Last name is required.';
      if (!contact.businessName.trim()) nextErrors.businessName = 'Business name is required.';
      if (!contact.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) nextErrors.email = 'A valid work email is required.';
      if (!contact.phone.trim() || contact.phone.replace(/\D/g, '').length < 7) nextErrors.phone = 'A valid phone number is required.';
      const website = normalizeWebsite(contact.website);
      try {
        if (!website) {
          nextErrors.website = 'Website is required.';
        } else {
          const parsed = new URL(website);
          if (!parsed.host) {
            nextErrors.website = 'Website must be a valid URL.';
          }
        }
      } catch {
        nextErrors.website = 'Website must be a valid URL.';
      }
      if (!contact.city.trim()) nextErrors.city = 'City is required.';
      if (!contact.state.trim()) nextErrors.state = 'State is required.';
      if (!contact.consentEmail) nextErrors.consentEmail = 'Email consent is required to deliver your report.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [answers, contact, currentStep]);

  const handleAnswerSelect = async (key: AssessmentAnswerKey, value: string) => {
    setErrorMessage(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setAnswers((prev) => ({ ...prev, [key]: value }));

    if (!resumeToken) {
      return;
    }

    try {
      await saveSessionPatch({ answers: { [key]: value }, currentStep: currentStep.id });
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleContactChange = <K extends keyof ContactState>(key: K, value: ContactState[K]) => {
    setErrorMessage(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
    setContact((prev) => ({ ...prev, [key]: value }));
  };

  const handleBack = async () => {
    if (stepIndex === 0) {
      return;
    }
    const nextIndex = stepIndex - 1;
    setStepIndex(nextIndex);
    setErrorMessage(null);
    if (!resumeToken) {
      return;
    }
    try {
      await saveSessionPatch({ currentStep: STEP_DEFINITIONS[nextIndex].id });
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const submitContact = useCallback(async () => {
    if (!resumeToken) {
      throw new Error('Missing assessment session. Please restart the assessment.');
    }

    const website = normalizeWebsite(contact.website);
    const response = await fetch('/api/assessment/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeToken,
        firstName: contact.firstName.trim(),
        lastName: contact.lastName.trim(),
        businessName: contact.businessName.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        website,
        city: contact.city.trim(),
        state: contact.state.trim(),
        consentEmail: contact.consentEmail,
        consentSms: contact.consentSms,
        utm: getUtmData(),
        campaignAttribution: typeof document !== 'undefined' && document.referrer ? { referrer: document.referrer } : undefined,
      }),
    });

    if (!response.ok) {
      const json = await safeJson<{ error?: string }>(response);
      throw new Error(json?.error ?? 'Unable to save contact information.');
    }
  }, [contact, resumeToken]);

  const handleNextOrSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const valid = validateCurrentStep();
    if (!valid) {
      return;
    }

    if (!resumeToken) {
      setErrorMessage('Missing assessment session. Please refresh and try again.');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentStep.isContact) {
        await submitContact();
      }

      if (isLastStep) {
        await saveSessionPatch({ currentStep: currentStep.id, completedStep: currentStep.id });
        const completeResponse = await fetch('/api/assessment/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeToken }),
        });
        const completeJson = await safeJson<{ reportToken?: string; error?: string }>(completeResponse);
        if (!completeResponse.ok || !completeJson?.reportToken) {
          throw new Error(completeJson?.error ?? 'Unable to complete your assessment. Please try again.');
        }
        localStorage.removeItem(RESUME_TOKEN_STORAGE_KEY);
        router.push(`/assessment/results/${completeJson.reportToken}`);
        return;
      }

      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      await saveSessionPatch({ currentStep: STEP_DEFINITIONS[nextIndex].id, completedStep: currentStep.id });
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressWidth = useMemo(() => `${Math.round(((stepIndex + 1) / STEP_DEFINITIONS.length) * 100)}%`, [stepIndex]);

  if (isBootstrapping) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm" role="status" aria-live="polite">
        Starting your secure assessment session...
      </div>
    );
  }

  return (
    <section ref={cardRef} className="rounded-3xl bg-white p-6 shadow-sm md:p-8" aria-label="Revenue recovery assessment">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-recovery-green">Step {stepIndex + 1} of {STEP_DEFINITIONS.length}</p>
        <h2 className="mt-2 text-2xl font-bold text-navy">{currentStep.label}</h2>
        <div className="mt-4 h-2 rounded-full bg-soft-background" aria-label="Assessment progress">
          <div className="h-2 rounded-full bg-aqua transition-all" style={{ width: progressWidth }} />
        </div>
        <ol className="mt-4 grid gap-2 text-sm text-navy-secondary md:grid-cols-3" aria-label="Progress steps">
          {STEP_DEFINITIONS.map((step, index) => (
            <li key={step.id} className={index <= stepIndex ? 'font-semibold text-navy' : ''}>{step.id}. {step.label}</li>
          ))}
        </ol>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-xl border border-critical-red/40 bg-critical-red/10 p-4 text-sm text-navy" role="alert">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="outline" size="default" type="button" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : null}

      <form onSubmit={handleNextOrSubmit} className="space-y-6" noValidate>
        {currentStep.questionKeys?.map((questionKey) => {
          const options = assessmentQuestionOptions[questionKey];
          return (
            <fieldset key={questionKey} className="space-y-3">
              <legend className="text-base font-semibold text-navy">{assessmentQuestionLabels[questionKey]}</legend>
              <div className="grid gap-3">
                {options.map((option) => {
                  const checked = answers[questionKey] === option.value;
                  return (
                    <label key={option.value} className={`cursor-pointer rounded-xl border p-4 text-sm ${checked ? 'border-aqua bg-aqua/10' : 'border-slate-200 bg-white hover:border-aqua/60'}`}>
                      <input
                        className="sr-only"
                        type="radio"
                        name={questionKey}
                        checked={checked}
                        onChange={() => {
                          void handleAnswerSelect(questionKey, option.value);
                        }}
                        aria-label={`${assessmentQuestionLabels[questionKey]} - ${option.label}`}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
              {fieldErrors[questionKey] ? <p className="text-sm text-critical-red">{fieldErrors[questionKey]}</p> : null}
            </fieldset>
          );
        })}

        {currentStep.isContact ? (
          <div className="space-y-4">
            <p className="text-sm text-navy-secondary">
              We only request business contact information to deliver your results. Do not include patient records, medical details, passwords, or payment-card data.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['firstName', 'First name', 'text'],
                ['lastName', 'Last name', 'text'],
                ['businessName', 'Business name', 'text'],
                ['email', 'Work email', 'email'],
                ['phone', 'Phone', 'tel'],
                ['website', 'Website', 'url'],
                ['city', 'City', 'text'],
                ['state', 'State', 'text'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-navy" htmlFor={key}>{label}</label>
                  <input
                    id={key}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    type={type}
                    value={String(contact[key as keyof ContactState] ?? '')}
                    onChange={(event) => handleContactChange(key as keyof ContactState, event.target.value as never)}
                    aria-invalid={Boolean(fieldErrors[key])}
                  />
                  {fieldErrors[key] ? <p className="mt-1 text-sm text-critical-red">{fieldErrors[key]}</p> : null}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-navy" htmlFor="consentEmail">
                <input
                  id="consentEmail"
                  type="checkbox"
                  checked={contact.consentEmail}
                  onChange={(event) => handleContactChange('consentEmail', event.target.checked)}
                />
                <span>{consentText}</span>
              </label>
              {fieldErrors.consentEmail ? <p className="text-sm text-critical-red">{fieldErrors.consentEmail}</p> : null}
              <label className="flex items-start gap-2 text-sm text-navy" htmlFor="consentSms">
                <input
                  id="consentSms"
                  type="checkbox"
                  checked={contact.consentSms}
                  onChange={(event) => handleContactChange('consentSms', event.target.checked)}
                />
                <span>Optional: I agree to receive SMS follow-up about my business assessment.</span>
              </label>
              <p className="text-xs text-navy-secondary">
                Privacy notice: this assessment is for business operations only. Data is used to calculate revenue-recovery estimates and follow up on your request.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0 || isSubmitting}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting || isBootstrapping || !resumeToken}>
              {isSubmitting ? 'Working...' : isLastStep ? 'Generate My Results' : 'Next'}
            </Button>
          </div>
          <p className="text-sm text-navy-secondary" role="status" aria-live="polite">
            {isSaving ? 'Saving progress...' : 'Progress saved as you go.'}
          </p>
        </div>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-4 text-sm text-navy-secondary">
        <p>
          Prefer to return later? Your progress is tied to a secure token in this browser.
          <Link href="/" className="ml-1 font-semibold text-navy underline underline-offset-2">Return to home</Link>
        </p>
      </div>
    </section>
  );
}
