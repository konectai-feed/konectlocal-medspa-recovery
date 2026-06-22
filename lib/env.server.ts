import 'server-only';
import { env } from './env';
export const serverEnv = { supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY };
