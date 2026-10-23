import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

const REVEAL_COOKIE = "cg_license_reveal";
const REVEAL_TTL_MS = 5 * 60 * 1000;
const IV_BYTES = 12;
const TAG_BYTES = 16;

type RevealPayload = {
  version: 1;
  orderNumber: string;
  userId: string;
  licenseKey: string;
  expiresAt: number;
};

type RevealIdentity = {
  orderNumber: string;
  userId: string;
};

function encryptionKey(): Buffer {
  return createHash("sha256")
    .update(`codegems-license-reveal:${env.LICENSE_HMAC_SECRET}`)
    .digest();
}

function encryptReveal(payload: RevealPayload): string {
  const iv = ivBytes();
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

function ivBytes(): Buffer {
  return randomBytes(IV_BYTES);
}

function decryptReveal(value: string): RevealPayload | null {
  try {
    const raw = Buffer.from(value, "base64url");

    if (raw.length <= IV_BYTES + TAG_BYTES) {
      return null;
    }

    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const parsed: unknown = JSON.parse(plaintext);

    if (!isRevealPayload(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isRevealPayload(value: unknown): value is RevealPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    payload.version === 1 &&
    typeof payload.orderNumber === "string" &&
    typeof payload.userId === "string" &&
    typeof payload.licenseKey === "string" &&
    typeof payload.expiresAt === "number"
  );
}

function isCurrentReveal(
  payload: RevealPayload | null,
  identity: RevealIdentity,
): payload is RevealPayload {
  return (
    payload !== null &&
    payload.expiresAt > Date.now() &&
    payload.orderNumber === identity.orderNumber &&
    payload.userId === identity.userId
  );
}

/**
 * Store the raw key briefly so the success page can reveal it exactly once.
 * The DB never stores the raw key; this encrypted, HttpOnly cookie is a
 * one-time delivery envelope and is deleted when consumed.
 */
export async function setLicenseRevealCookie(input: {
  orderNumber: string;
  userId: string;
  licenseKey: string;
}): Promise<void> {
  const store = await cookies();
  const payload: RevealPayload = {
    version: 1,
    orderNumber: input.orderNumber,
    userId: input.userId,
    licenseKey: input.licenseKey,
    expiresAt: Date.now() + REVEAL_TTL_MS,
  };

  store.set(REVEAL_COOKIE, encryptReveal(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: Math.floor(REVEAL_TTL_MS / 1000),
    path: "/",
    priority: "high",
  });
}

export async function peekLicenseRevealCookie(
  identity: RevealIdentity,
): Promise<boolean> {
  const store = await cookies();
  const value = store.get(REVEAL_COOKIE)?.value;

  if (!value) {
    return false;
  }

  return isCurrentReveal(decryptReveal(value), identity);
}

export async function consumeLicenseRevealCookie(
  identity: RevealIdentity,
): Promise<string | null> {
  const store = await cookies();
  const value = store.get(REVEAL_COOKIE)?.value;

  if (!value) {
    return null;
  }

  store.delete(REVEAL_COOKIE);

  const payload = decryptReveal(value);

  if (!isCurrentReveal(payload, identity)) {
    return null;
  }

  return payload.licenseKey;
}
