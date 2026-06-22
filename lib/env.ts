import { z } from 'zod';
const envSchema = z.object({ NEXT_PUBLIC_SUPABASE_URL: z.string().url(), NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(), NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'), LOG_LEVEL: z.enum(['debug','info','warn','error']).default('info') });
export const env = envSchema.parse(process.env);
export const publicEnv = { supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL, supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, appUrl: env.NEXT_PUBLIC_APP_URL };
