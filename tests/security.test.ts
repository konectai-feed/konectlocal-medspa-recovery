import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/0001_foundation.sql', 'utf8');

describe('security hardening', () => {
  it('does not define a database calculation placeholder', () => {
    expect(sql).not.toContain('calculate_recovery_assessment');
  });

  it('revokes privileged SECURITY DEFINER RPCs from anon and authenticated users', () => {
    for (const fn of ['upsert_lead', 'record_lead_event', 'get_active_formula_version', 'generate_report_token', 'mark_lead_hot', 'deduplicate_lead_candidate']) {
      expect(sql).toContain(`revoke execute on function public.${fn}`);
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*to service_role`, 'i'));
    }
  });
});
