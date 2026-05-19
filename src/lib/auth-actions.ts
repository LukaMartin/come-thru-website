"use server";

import { redirect } from "next/navigation";
import {
  createSessionAuthClient,
  persistCurrentAuthSession,
  signInAdmin,
  signOutAdmin,
} from "@/lib/admin-auth";
import * as Sentry from "@sentry/nextjs";

export type LoginFormState = {
  error?: string;
};

export type MfaEnrollState = {
  error?: string;
  factorId?: string;
  qrCode?: string;
  secret?: string;
};

export type MfaVerifyState = {
  error?: string;
};

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAdminAction(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const result = await signInAdmin(email, password);

  if ("error" in result) {
    return { error: result.error };
  }

  redirect("/admin/mfa");
}

export async function enrollMfaAction(
  _state: MfaEnrollState,
): Promise<MfaEnrollState> {
  void _state;

  try {
    const { supabase } = await createSessionAuthClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Come Thru Admin ${new Date().toISOString()}`,
    });

    if (error || !data) {
      return { error: error?.message ?? "Could not create MFA factor." };
    }

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        "admin.action": "mfa_enroll",
        "app.area": "admin",
      },
    });
    return {
      error:
        error instanceof Error ? error.message : "Could not create MFA factor.",
    };
  }
}

export async function verifyMfaAction(
  _state: MfaVerifyState,
  formData: FormData,
): Promise<MfaVerifyState> {
  const factorId = getFormString(formData, "factorId");
  const code = getFormString(formData, "code").replace(/\s/g, "");

  if (!factorId || !/^\d{6}$/.test(code)) {
    return { error: "Enter the 6-digit authenticator code." };
  }

  try {
    const { supabase } = await createSessionAuthClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });

    if (challenge.error || !challenge.data) {
      return {
        error: challenge.error?.message ?? "Could not create MFA challenge.",
      };
    }

    const verification = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });

    if (verification.error) {
      return { error: verification.error.message };
    }

    await persistCurrentAuthSession(supabase);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        "admin.action": "mfa_verify",
        "app.area": "admin",
      },
    });
    return {
      error:
        error instanceof Error ? error.message : "Could not verify MFA code.",
    };
  }

  redirect("/admin/events");
}

export async function logoutAdminAction() {
  await signOutAdmin();
  redirect("/admin/login");
}
