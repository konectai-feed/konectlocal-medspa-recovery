export type OnboardingStatus =
  | 'required'
  | 'started'
  | 'in_progress'
  | 'submitted'
  | 'activation_review'
  | 'configuration'
  | 'ready_for_launch'
  | 'active'
  | 'delayed'
  | 'cancelled';

export type PackageKey = 'recovery' | 'command_center';

export type ResponseValue = string | number | boolean | Record<string, unknown> | unknown[] | null;

export type OnboardingSectionKey =
  | 'business_information'
  | 'practice_profile'
  | 'lead_communications'
  | 'patient_recovery_workflows'
  | 'accounts_access'
  | 'compliance_approvals';

export type SectionFields = Record<string, ResponseValue>;

export type OnboardingDraftInput = Partial<Record<OnboardingSectionKey, SectionFields>>;

export type CompletionResult = {
  completionPercent: number;
  missingBySection: Record<OnboardingSectionKey, string[]>;
  isComplete: boolean;
};

export type ActivationTaskDefinition = {
  taskKey: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
};

export type LifecycleSyncAction = {
  addLists: string[];
  removeLists: string[];
  attributes: Record<string, string | number | boolean | null>;
};
