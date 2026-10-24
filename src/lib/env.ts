import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().optional(),

    AUTH_URL: z.string().url().optional(),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters"),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    ADMIN_EMAILS: z
      .string()
      .default("admin@local.test")
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),

    DEV_AUTH: booleanString,

    PAYMENT_PROVIDER: z.enum(["mock", "midtrans"]).default("mock"),
    MIDTRANS_SERVER_KEY: z.string().optional(),
    MIDTRANS_CLIENT_KEY: z.string().optional(),
    MIDTRANS_IS_PRODUCTION: booleanString,
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("CodeGems <noreply@example.com>"),
    RESEND_API_KEY: z.string().optional(),
    LICENSE_HMAC_SECRET: z
      .string()
      .min(32, "LICENSE_HMAC_SECRET must be at least 32 characters"),

    STORAGE_DRIVER: z.enum(["local", "vercel-blob"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default("./storage"),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.EMAIL_PROVIDER === "resend" && !value.RESEND_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
      });
    }

    if (value.STORAGE_DRIVER === "vercel-blob" && !value.BLOB_READ_WRITE_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["BLOB_READ_WRITE_TOKEN"],
        message:
          "BLOB_READ_WRITE_TOKEN is required when STORAGE_DRIVER=vercel-blob",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;

/**
 * Dev credentials are only available when explicitly enabled and never in
 * production, even if DEV_AUTH is accidentally left on.
 */
export const isDevAuthEnabled = env.DEV_AUTH && env.NODE_ENV !== "production";
