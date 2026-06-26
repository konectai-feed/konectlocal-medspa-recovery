'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type SectionKey =
  | 'business_information'
  | 'practice_profile'
  | 'lead_communications'
  | 'patient_recovery_workflows'
  | 'accounts_access'
  | 'compliance_approvals';

type Responses = Partial<Record<SectionKey, Record<string, string>>>;

type OnboardingPayload = {
  onboarding: {
    id: string;
    status: string;
    packageKey: string;
    completionPercent: number;
    currentStep: string | null;
    manualReviewRequired: boolean;
  };
  responses: Responses;
  messaging: {
    sensitiveWarning: string;
  };
};

const sections: { key: SectionKey; title: string; fields: { key: string; label: string; type?: string }[] }[] = [
  {
    key: 'business_information',
    title: 'Business Information',
    fields: [
      { key: 'legal_business_name', label: 'Legal business name' },
      { key: 'public_business_name', label: 'Public business name' },
      { key: 'website', label: 'Website' },
      { key: 'primary_location_address', label: 'Primary location address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'zip_code', label: 'ZIP code' },
      { key: 'timezone', label: 'Timezone' },
      { key: 'number_of_locations', label: 'Number of locations', type: 'number' },
      { key: 'primary_contact_name', label: 'Primary contact name' },
      { key: 'primary_contact_email', label: 'Primary contact email', type: 'email' },
      { key: 'primary_contact_phone', label: 'Primary contact phone', type: 'tel' },
    ],
  },
  {
    key: 'practice_profile',
    title: 'Practice Profile',
    fields: [
      { key: 'treatments_services', label: 'Treatments and services offered' },
      { key: 'highest_value_services', label: 'Highest-value services' },
      { key: 'providers', label: 'Providers' },
      { key: 'provider_count', label: 'Provider count', type: 'number' },
      { key: 'average_monthly_inquiries', label: 'Average monthly inquiries', type: 'number' },
      { key: 'approx_consultation_volume', label: 'Approximate monthly consultation volume', type: 'number' },
      { key: 'approx_monthly_appointments', label: 'Approximate monthly appointments', type: 'number' },
      { key: 'average_transaction_value', label: 'Average transaction value', type: 'number' },
      { key: 'memberships_offered', label: 'Memberships offered' },
      { key: 'packages_offered', label: 'Packages or treatment series offered' },
      { key: 'financing_offered', label: 'Financing offered' },
      { key: 'current_booking_process', label: 'Current booking process' },
    ],
  },
  {
    key: 'lead_communications',
    title: 'Lead and Communications Systems',
    fields: [
      { key: 'primary_business_phone', label: 'Primary business phone', type: 'tel' },
      { key: 'missed_call_process', label: 'Missed-call process' },
      { key: 'after_hours_process', label: 'After-hours process' },
      { key: 'current_crm', label: 'Current CRM' },
      { key: 'current_booking_software', label: 'Current booking software' },
      { key: 'current_website_chat', label: 'Current website chat solution' },
      { key: 'sms_provider', label: 'SMS provider' },
      { key: 'email_platform', label: 'Email platform' },
      { key: 'call_tracking_provider', label: 'Call-tracking provider' },
      { key: 'current_lead_sources', label: 'Current lead sources' },
      { key: 'current_lead_response_owner', label: 'Current lead-response owner' },
      { key: 'normal_response_time', label: 'Normal response time' },
      { key: 'preferred_escalation_contacts', label: 'Preferred escalation contacts' },
    ],
  },
  {
    key: 'patient_recovery_workflows',
    title: 'Patient Recovery Workflows',
    fields: [
      { key: 'consultation_follow_up_process', label: 'Consultation follow-up process' },
      { key: 'no_show_process', label: 'No-show process' },
      { key: 'cancellation_process', label: 'Cancellation process' },
      { key: 'overdue_patient_process', label: 'Overdue patient process' },
      { key: 'dormant_patient_process', label: 'Dormant patient process' },
      { key: 'treatment_series_completion_process', label: 'Treatment-series completion process' },
      { key: 'membership_renewal_process', label: 'Membership renewal process' },
      { key: 'review_request_process', label: 'Review-request process' },
      { key: 'recall_intervals', label: 'Recall intervals' },
      { key: 'desired_reactivation_segments', label: 'Desired reactivation segments' },
    ],
  },
  {
    key: 'accounts_access',
    title: 'Accounts and Access',
    fields: [
      { key: 'google_business_profile_access_status', label: 'Google Business Profile access status' },
      { key: 'facebook_access_status', label: 'Facebook access status' },
      { key: 'instagram_access_status', label: 'Instagram access status' },
      { key: 'website_cms_access_status', label: 'Website/CMS access status' },
      { key: 'domain_dns_access_status', label: 'Domain/DNS access status' },
      { key: 'booking_platform_access_status', label: 'Booking-platform access status' },
      { key: 'crm_access_status', label: 'CRM access status' },
      { key: 'phone_system_access_status', label: 'Phone system access status' },
      { key: 'patient_list_import_status', label: 'Patient list import status' },
      { key: 'secure_credential_exchange_method', label: 'Approved method for secure credential exchange' },
    ],
  },
  {
    key: 'compliance_approvals',
    title: 'Compliance and Approvals',
    fields: [
      { key: 'consent_onboarding_communications', label: 'Consent to onboarding communications' },
      { key: 'authorization_configure_systems', label: 'Authorization to configure approved systems' },
      { key: 'business_hours_confirmation', label: 'Business-hours confirmation' },
      { key: 'escalation_approval', label: 'Escalation approval' },
      { key: 'messaging_tone_approval', label: 'Messaging-tone approval' },
      { key: 'patient_data_handling_acknowledgment', label: 'Patient-data handling acknowledgment' },
      { key: 'hipaa_sensitive_data_warning_acknowledged', label: 'HIPAA-sensitive-data warning acknowledged' },
      { key: 'launch_approval_contact', label: 'Launch approval contact' },
      { key: 'digital_signature_name', label: 'Digital signature/name' },
      { key: 'submitted_timestamp', label: 'Submission timestamp confirmation (type today\'s date)' },
    ],
  },
];

const recoveryModules = [
  { key: 'module_digital_inquiry_capture', label: 'Digital inquiry capture' },
  { key: 'module_web_chat', label: 'Web chat' },
  { key: 'module_lead_routing', label: 'Lead routing' },
  { key: 'module_consultation_follow_up', label: 'Consultation follow-up' },
  { key: 'module_patient_recall', label: 'Patient recall' },
  { key: 'module_review_workflow', label: 'Review workflow' },
  { key: 'module_local_visibility_setup', label: 'Local visibility setup' },
  { key: 'module_crm_inbox_preparation', label: 'CRM inbox preparation' },
  { key: 'module_executive_reporting_preparation', label: 'Executive reporting preparation' },
];

const commandCenterOnlyModules = [
  { key: 'module_ai_voice_preparation', label: 'AI voice preparation' },
  { key: 'module_call_routing', label: 'Call routing' },
  { key: 'module_after_hours_handling', label: 'After-hours handling' },
  { key: 'module_no_show_recovery', label: 'No-show recovery' },
  { key: 'module_cancellation_recovery', label: 'Cancellation recovery' },
  { key: 'module_dormant_patient_reactivation', label: 'Dormant-patient reactivation' },
  { key: 'module_treatment_series_completion', label: 'Treatment-series completion' },
  { key: 'module_membership_nurture', label: 'Membership nurture' },
  { key: 'module_advanced_routing', label: 'Advanced routing' },
  { key: 'module_deeper_reporting_configuration', label: 'Deeper reporting configuration' },
];

export function OnboardingForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingPayload['onboarding'] | null>(null);
  const [responses, setResponses] = useState<Responses>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [missingBySection, setMissingBySection] = useState<Record<string, string[]>>({});
  const [sensitiveWarning, setSensitiveWarning] = useState('Do not submit passwords or protected health information unless explicitly instructed through a compliant process.');

  const completionPercent = onboarding?.completionPercent ?? 0;
  const locationCount = Number(responses.business_information?.number_of_locations ?? 1) || 1;
  const packageKey = String(onboarding?.packageKey ?? 'recovery').toLowerCase();
  const isCommandCenter = packageKey === 'command_center';
  const requiresEnterpriseAck = isCommandCenter && locationCount >= 10;

  const activeSection = sections[currentSection];

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const res = await fetch(`/api/onboarding/${token}`);
      if (!mounted) return;
      if (!res.ok) {
        setError('This onboarding link is invalid, expired, or revoked.');
        setLoading(false);
        return;
      }

      const data = (await res.json()) as OnboardingPayload;
      setOnboarding(data.onboarding);
      setResponses(data.responses ?? {});
      setSensitiveWarning(data.messaging.sensitiveWarning);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  const progressLabel = useMemo(() => {
    if (!onboarding) return 'Starting onboarding';
    return `${completionPercent}% complete`;
  }, [completionPercent, onboarding]);

  function updateField(section: SectionKey, key: string, value: string) {
    setResponses((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] ?? {}),
        [key]: value,
      },
    }));
  }

  function toggleModule(key: string, checked: boolean) {
    updateField('practice_profile', key, checked ? 'yes' : '');
  }

  const saveDraft = useCallback(async () => {
    setSaveState('saving');
    const res = await fetch(`/api/onboarding/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses }),
    });

    if (!res.ok) {
      setSaveState('error');
      return;
    }

    const data = (await res.json()) as { completion: { completionPercent: number; missingBySection: Record<string, string[]> } };
    setOnboarding((prev) => (prev ? { ...prev, completionPercent: data.completion.completionPercent } : prev));
    setMissingBySection(data.completion.missingBySection ?? {});
    setSaveState('saved');
  }, [responses, token]);

  useEffect(() => {
    if (!onboarding) return;
    const timeout = setTimeout(() => {
      void saveDraft();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [onboarding, saveDraft]);

  async function submitOnboarding() {
    const res = await fetch(`/api/onboarding/${token}/submit`, { method: 'POST' });
    const payload = await res.json();
    if (!res.ok) {
      setMissingBySection(payload.completion?.missingBySection ?? {});
      setError(payload.error ?? 'Submission failed.');
      return;
    }

    setError(null);
    setOnboarding((prev) => (prev ? { ...prev, status: 'submitted', completionPercent: 100 } : prev));
  }

  if (loading) {
    return <main className="min-h-screen bg-soft-background p-6"><div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-6">Loading onboarding...</div></main>;
  }

  if (error && !onboarding) {
    return <main className="min-h-screen bg-soft-background p-6"><div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div></main>;
  }

  if (!onboarding) {
    return null;
  }

  if (onboarding.status === 'submitted' || onboarding.status === 'activation_review' || onboarding.status === 'configuration' || onboarding.status === 'ready_for_launch' || onboarding.status === 'active') {
    return (
      <main className="min-h-screen bg-soft-background px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-navy">Onboarding Submitted</h1>
          <p className="mt-4 text-navy-secondary">Thank you. Your onboarding details are in review by the KonectLocal activation team.</p>
          <p className="mt-3 text-sm text-navy-secondary">Need support? Email support@konectlocal.com and include your business name.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-soft-background px-4 py-6 md:py-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-recovery-green">KonectLocal Activation Onboarding</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">Configure Your Revenue Recovery System</h1>
          <p className="mt-2 text-navy-secondary">Complete this onboarding so our team can launch your implementation safely and quickly.</p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-navy-secondary">
              <span>{progressLabel}</span>
              <span>Section {currentSection + 1} of {sections.length}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-aqua transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {sensitiveWarning}
          </div>

          <div className="mt-3 text-xs text-navy-secondary">
            Autosave status: {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Waiting for changes'}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-3xl bg-white p-4 shadow-sm">
            <nav className="space-y-2" aria-label="Onboarding sections">
              {sections.map((section, index) => {
                const missing = missingBySection[section.key]?.length ?? 0;
                return (
                  <button
                    key={section.key}
                    type="button"
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ${index === currentSection ? 'bg-navy text-white' : 'bg-slate-100 text-navy'}`}
                    onClick={() => setCurrentSection(index)}
                  >
                    <div className="font-semibold">{section.title}</div>
                    {missing > 0 ? <div className="text-xs opacity-80">{missing} required fields missing</div> : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-navy">{activeSection.title}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {activeSection.fields.map((field) => (
                <label key={field.key} className="block text-sm">
                  <span className="mb-1 block font-semibold text-navy">{field.label}</span>
                  <input
                    type={field.type ?? 'text'}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-navy outline-none focus:border-aqua"
                    value={responses[activeSection.key]?.[field.key] ?? ''}
                    onChange={(event) => updateField(activeSection.key, field.key, event.target.value)}
                  />
                </label>
              ))}
            </div>

            {activeSection.key === 'practice_profile' ? (
              <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-semibold text-navy">Package Preparation Modules</h3>
                <p className="text-sm text-navy-secondary">Select each module your team is ready to configure.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {recoveryModules.map((moduleField) => {
                    const checked = Boolean(responses.practice_profile?.[moduleField.key]);
                    return (
                      <label key={moduleField.key} className="flex items-center gap-2 text-sm text-navy">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={checked}
                          onChange={(event) => toggleModule(moduleField.key, event.target.checked)}
                        />
                        {moduleField.label}
                      </label>
                    );
                  })}
                </div>

                {isCommandCenter ? (
                  <>
                    <h4 className="text-base font-semibold text-navy">Command Center Add-ons</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {commandCenterOnlyModules.map((moduleField) => {
                        const checked = Boolean(responses.practice_profile?.[moduleField.key]);
                        return (
                          <label key={moduleField.key} className="flex items-center gap-2 text-sm text-navy">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300"
                              checked={checked}
                              onChange={(event) => toggleModule(moduleField.key, event.target.checked)}
                            />
                            {moduleField.label}
                          </label>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {activeSection.key === 'compliance_approvals' && requiresEnterpriseAck ? (
              <label className="mt-5 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-orange-300"
                  checked={Boolean(responses.compliance_approvals?.enterprise_activation_review_acknowledged)}
                  onChange={(event) => updateField('compliance_approvals', 'enterprise_activation_review_acknowledged', event.target.checked ? 'yes' : '')}
                />
                I acknowledge this account requires manual enterprise activation review for 10+ locations.
              </label>
            ) : null}

            {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
                disabled={currentSection === 0}
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1))}
                disabled={currentSection === sections.length - 1}
              >
                Next
              </Button>
              <Button variant="outline" onClick={() => void saveDraft()}>Save and Continue</Button>
              <Button onClick={() => void submitOnboarding()}>Submit Onboarding</Button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
