import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

const scannerAuthCookie = "scanner_auth";
const scannerSessionMaxAge = 60 * 60 * 12;

function getScannerPin() {
  const pin = requireEnv("ADMIN_SCAN_PIN");

  if (!/^\d{6}$/.test(pin)) {
    throw new Error("ADMIN_SCAN_PIN must be exactly 6 digits.");
  }

  return pin;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function createScannerSessionValue() {
  return createHmac("sha256", getScannerPin()).update("scanner").digest("hex");
}

export function isValidScannerPin(pin: string) {
  return /^\d{6}$/.test(pin) && safeEqual(pin, getScannerPin());
}

export async function isScannerAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(scannerAuthCookie)?.value;

  return Boolean(session && safeEqual(session, createScannerSessionValue()));
}

export async function setScannerAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.set(scannerAuthCookie, createScannerSessionValue(), {
    httpOnly: true,
    maxAge: scannerSessionMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
