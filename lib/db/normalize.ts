export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function normalizePhone(phone: string) { const digits = phone.replace(/\D/g, ''); return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits; }
export function normalizeDomain(input: string) { try { const url = input.startsWith('http') ? new URL(input) : new URL(`https://${input}`); return url.hostname.toLowerCase().replace(/^www\./, ''); } catch { return input.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]; } }
