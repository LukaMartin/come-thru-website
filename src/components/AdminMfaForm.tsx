"use client";

import { useActionState, useState } from "react";
import {
  enrollMfaAction,
  verifyMfaAction,
  type MfaEnrollState,
  type MfaVerifyState,
} from "@/lib/auth-actions";

const enrollInitialState: MfaEnrollState = {};
const verifyInitialState: MfaVerifyState = {};

type AdminMfaFormProps = {
  initialFactorId: string | null;
};

function getQrCodeSrc(qrCode: string) {
  const trimmedQrCode = qrCode.trimEnd();

  if (trimmedQrCode.startsWith("data:")) {
    return trimmedQrCode;
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(trimmedQrCode)}`;
}

export function AdminMfaForm({ initialFactorId }: AdminMfaFormProps) {
  const [showManualSetupKey, setShowManualSetupKey] = useState(false);
  const [enrollState, enrollAction, isEnrolling] = useActionState(
    enrollMfaAction,
    enrollInitialState,
  );
  const [verifyState, verifyAction, isVerifying] = useActionState(
    verifyMfaAction,
    verifyInitialState,
  );
  const factorId = enrollState.factorId ?? initialFactorId;

  return (
    <div className="mt-8 grid gap-6">
      {!factorId ? (
        <form action={enrollAction} className="grid gap-4">
          {enrollState.error ? (
            <p className="text-sm text-red-300">{enrollState.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isEnrolling}
            className="rounded-full bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60"
          >
            {isEnrolling ? "Creating factor..." : "Set up authenticator"}
          </button>
        </form>
      ) : null}

      {enrollState.qrCode ? (
        <div className="grid gap-4 border border-[#f3eadb]/14 bg-black/25 p-4">
          {/* The MFA QR code is a tiny server-generated data URL, not a remote asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getQrCodeSrc(enrollState.qrCode)}
            alt="Authenticator QR code"
            width={208}
            height={208}
            className="mx-auto size-52 bg-white p-3"
          />
          {enrollState.secret ? (
            <div className="grid gap-3 text-center">
              <button
                type="button"
                onClick={() => setShowManualSetupKey((current) => !current)}
                className="mx-auto w-fit text-xs font-semibold uppercase tracking-[0.18em] text-[#d7c7ad] transition hover:text-[#f8f0e3]"
              >
                {showManualSetupKey
                  ? "Hide manual setup key"
                  : "Show manual setup key"}
              </button>
              {showManualSetupKey ? (
                <p className="break-all font-mono text-xs text-[#f3eadb]/68">
                  {enrollState.secret}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {factorId ? (
        <form action={verifyAction} className="grid gap-4">
          <input type="hidden" name="factorId" value={factorId} />
          <label className="grid gap-2 text-sm text-[#f3eadb]/72">
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className="border border-[#f3eadb]/14 bg-black/35 px-4 py-3 text-center font-mono text-2xl tracking-[0.28em] text-[#f8f0e3] outline-none transition focus:border-[#d7c7ad]/70"
            />
          </label>
          {verifyState.error ? (
            <p className="text-sm text-red-300">{verifyState.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isVerifying}
            className="rounded-full bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60"
          >
            {isVerifying ? "Verifying..." : "Verify and continue"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
