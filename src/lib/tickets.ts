import crypto from "node:crypto";
import QRCode from "qrcode";
import { getAppUrl, requireEnv } from "@/lib/env";

export type EncryptedTicketSecret = {
  version: number;
  algorithm: "aes-256-gcm";
  iv: string;
  ciphertext: string;
  authTag: string;
};

export function createTicketSecret() {
  return crypto.randomBytes(24).toString("base64url");
}

export function createTicketCode() {
  return crypto.randomBytes(12).toString("hex");
}

export function hashTicketSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function encryptTicketSecret(secret: string): EncryptedTicketSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getTicketSecretEncryptionKey(),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptTicketSecret({
  ciphertext,
  iv,
  authTag,
}: {
  ciphertext: string;
  iv: string;
  authTag: string;
}) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getTicketSecretEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getTicketSecretEncryptionKey() {
  const key = requireEnv("TICKET_SECRET_ENCRYPTION_KEY").trim();
  const encoding = /^[0-9a-f]{64}$/i.test(key) ? "hex" : "base64";
  const decoded = Buffer.from(key, encoding);

  if (decoded.length !== 32) {
    throw new Error(
      "TICKET_SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return decoded;
}

export function getTicketUrl(ticketCode: string, secret: string) {
  const url = new URL(`/tickets/${ticketCode}`, getAppUrl());
  url.searchParams.set("secret", secret);
  return url.toString();
}

export async function createTicketQrDataUrl(
  ticketCode: string,
  secret: string,
) {
  return QRCode.toDataURL(getTicketUrl(ticketCode, secret), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
  });
}

export function parseTicketQr(qr: string) {
  try {
    const url = new URL(qr);
    const parts = url.pathname.split("/").filter(Boolean);
    const ticketIndex = parts.indexOf("tickets");
    const code = ticketIndex >= 0 ? parts[ticketIndex + 1] : null;
    const secret = url.searchParams.get("secret");

    if (!code || !secret) {
      return null;
    }

    return { code, secret };
  } catch {
    return null;
  }
}

export function formatMoney(cents: number, currency = "aud") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  }).format(new Date(value));
}

export function formatEventDateRange(
  startValue: string,
  endValue?: string | null,
) {
  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : null;
  const date = formatShortEventDate(start);
  const startTime = formatEventTime(start);

  if (!end) {
    return `${date}, ${startTime}`;
  }

  const endDate = formatShortEventDate(end);
  const endTime = formatEventTime(end);

  if (date === endDate) {
    return `${date}, ${startTime} - ${endTime}`;
  }

  return `${date}, ${startTime} - ${endDate}, ${endTime}`;
}

function formatShortEventDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Australia/Sydney",
  }).formatToParts(value);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${weekday}, ${day} ${month}`;
}

function formatEventTime(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: value.getMinutes() === 0 ? undefined : "2-digit",
    hour12: true,
    timeZone: "Australia/Sydney",
  })
    .format(value)
    .replace(/\s/g, "")
    .toLowerCase();
}
