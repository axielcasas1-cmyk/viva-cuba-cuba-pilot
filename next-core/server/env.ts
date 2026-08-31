import {z} from 'zod';

export const env = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default('vc_session'),
  RP_ID: z.string().min(1),
  RP_ORIGIN: z.string().url(),
  OWNER_BOOTSTRAP_SECRET: z.string().min(24)
}).parse(process.env);
