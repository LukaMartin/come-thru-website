"use client";

import { useActionState } from "react";
import { loginAdminAction, type LoginFormState } from "@/lib/auth-actions";

const initialState: LoginFormState = {};

export function AdminLoginForm() {
  const [state, action, isPending] = useActionState(
    loginAdminAction,
    initialState,
  );

  return (
    <form action={action} className="mt-8 grid gap-4">
      <label className="grid gap-2 text-sm text-[#f3eadb]/72">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border border-[#f3eadb]/14 bg-black/35 px-4 py-3 text-base text-[#f8f0e3] outline-none transition focus:border-[#d7c7ad]/70"
        />
      </label>
      <label className="grid gap-2 text-sm text-[#f3eadb]/72">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border border-[#f3eadb]/14 bg-black/35 px-4 py-3 text-base text-[#f8f0e3] outline-none transition focus:border-[#d7c7ad]/70"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-red-300">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
