import { serverEnv } from '@/lib/env.server';

export type VendastaProvisioningPayload = {
  dryRun: boolean;
  packageKey: string;
  partnerId?: string;
  marketId?: string;
  leadId: string;
  assessmentId: string;
  provisionedAt?: string;
};

export function createVendastaProvisioningAdapter({ provisioningEnabled = serverEnv.VENDASTA_PROVISIONING_ENABLED }: { provisioningEnabled?: boolean } = {}) {
  return {
    provisioningEnabled,
    prepare(payload: VendastaProvisioningPayload): VendastaProvisioningPayload {
      if (!provisioningEnabled) {
        return { ...payload, dryRun: true, partnerId: serverEnv.VENDASTA_PARTNER_ID, marketId: serverEnv.VENDASTA_MARKET_ID };
      }
      return { ...payload, dryRun: false, partnerId: serverEnv.VENDASTA_PARTNER_ID, marketId: serverEnv.VENDASTA_MARKET_ID, provisionedAt: new Date().toISOString() };
    },
  };
}

export function prepareVendastaProvisioningPayload(adapter: ReturnType<typeof createVendastaProvisioningAdapter>, context: { leadId: string; assessmentId: string; packageKey: string; partnerId?: string; marketId?: string }) {
  return adapter.prepare({
    dryRun: !adapter.provisioningEnabled,
    packageKey: context.packageKey,
    leadId: context.leadId,
    assessmentId: context.assessmentId,
    partnerId: context.partnerId,
    marketId: context.marketId,
  });
}
