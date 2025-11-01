import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().min(1).default(3000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  DATABASE_URL: z.string().url(),
  
  // Email config
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  EMAIL_FROM: z.string().email(),
  
  // App config
  APP_ORIGIN: z.string().url(),
  // App versioning for forced updates
  APP_LATEST_VERSION: z.string().default('1.0.0'),
  APP_MIN_SUPPORTED_VERSION: z.string().default('1.0.0'),
  RESET_CODE_TTL_MINUTES: z.coerce.number().min(1).default(30),
  RESET_CODE_MAX_ATTEMPTS: z.coerce.number().min(1).default(5),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE,
  EMAIL_FROM: process.env.EMAIL_FROM,
  
  APP_ORIGIN: process.env.APP_ORIGIN,
  RESET_CODE_TTL_MINUTES: process.env.RESET_CODE_TTL_MINUTES,
  RESET_CODE_MAX_ATTEMPTS: process.env.RESET_CODE_MAX_ATTEMPTS,
});