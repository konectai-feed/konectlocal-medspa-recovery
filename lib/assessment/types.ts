export type AssessmentQuestionOption = {
  value: string;
  label: string;
  score_points: number;
  calculation_factor: number;
  display_order: number;
  active: boolean;
  routing_flags?: string[];
};

export type AssessmentAnswerKey =
  | 'location_count_band'
  | 'monthly_inquiry_band'
  | 'average_value_band'
  | 'missed_call_handling'
  | 'digital_response_time'
  | 'after_hours_coverage'
  | 'inquiry_booking_rate_band'
  | 'unbooked_lead_followup'
  | 'no_show_rate_band'
  | 'missed_appointment_recovery'
  | 'treatment_recall_process'
  | 'reactivation_process'
  | 'membership_package_maturity'
  | 'review_request_process'
  | 'reporting_visibility';

export type AssessmentAnswers = Partial<Record<AssessmentAnswerKey, string>>;

export type EditedAssumptions = {
  monthlyInquiries?: number;
  averageValue?: number;
  bookingRate?: number;
  noShowRate?: number;
  dormantPool?: number;
};

export type ContactCaptureData = {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  consentEmail: boolean;
  consentSms?: boolean;
  campaignAttribution?: Record<string, string>;
  utm?: Record<string, string>;
};

export type LeakCategory = {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  ratio: number;
  severityLabel: string;
  estimatedLow: number;
  estimatedHigh: number;
};

export type CalculationSnapshot = {
  scoreBreakdown: Record<string, number>;
  categorySeverity: Record<string, number>;
  opportunity: {
    rawLow: number;
    rawHigh: number;
    adjustedLow: number;
    adjustedHigh: number;
    capLow: number;
    capHigh: number;
    finalLow: number;
    finalHigh: number;
  };
  assumptions: {
    inquiries: number;
    value: number;
    bookingRate: number;
    noShowRate: number;
    dormantPool: number;
  };
};

export type AssessmentResult = {
  recoveryScore: number;
  recoveryLevel: string;
  opportunityLow: number;
  opportunityHigh: number;
  confidenceScore: number;
  confidenceLevel: string;
  categorySeverityLabels: Record<string, string>;
  topLeaks: LeakCategory[];
  positiveFindings: string[];
  recommendedPackage: string;
  packageJustification: string;
  routingScore: number;
  accountValueScore: number;
  salesReadinessScore: number;
  isHotLead: boolean;
  formulaVersion: string;
  benchmarkVersion: string;
  primaryLeak: string;
  secondaryLeak?: string;
  thirdLeak?: string;
  calculationSnapshot: CalculationSnapshot;
};
