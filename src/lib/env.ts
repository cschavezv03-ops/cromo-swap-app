import Constants from 'expo-constants';
import { z } from 'zod';

const EnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(8),
});

const raw = {
  EXPO_PUBLIC_SUPABASE_URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ??
    '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ??
    '',
  EXPO_PUBLIC_OTP_LENGTH: process.env.EXPO_PUBLIC_OTP_LENGTH ?? '8',
};

const parsed = EnvSchema.safeParse(raw);

if (!parsed.success && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] missing or invalid env vars — auth and data calls will fail until you create .env from .env.example.\n',
    parsed.error.flatten().fieldErrors,
  );
}

export const env = parsed.success
  ? parsed.data
  : {
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
      EXPO_PUBLIC_OTP_LENGTH: 8,
    };

export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const OTP_LENGTH = env.EXPO_PUBLIC_OTP_LENGTH;
