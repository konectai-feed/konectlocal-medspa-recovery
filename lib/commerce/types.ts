export type CheckoutTokenPayload = {
  leadId: string;
  assessmentId: string;
  packageKey: string;
  campaignSource?: string;
  partnerReference?: string;
  exp: number;
  nonce: string;
  version: 1;
};
