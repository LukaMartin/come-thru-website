"use client";

import { useActionState, useState } from "react";
import {
  handleContactFormSubmission,
  type ContactFormState,
} from "@/lib/contact";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [formKey, setFormKey] = useState(0);

  return (
    <ContactFormBody
      key={formKey}
      onReset={() => setFormKey((currentKey) => currentKey + 1)}
    />
  );
}

function ContactFormBody({ onReset }: { onReset: () => void }) {
  const [state, formAction, isPending] = useActionState(
    handleContactFormSubmission,
    initialState,
  );

  const labelClass =
    "text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58";
  const fieldClass =
    "mt-2 w-full border border-[#f3eadb]/12 bg-black/30 px-4 py-3 text-sm text-[#f8f0e3] outline-none transition duration-300 placeholder:text-[#f3eadb]/30 focus:border-[#d7c7ad]/60";

  if (state.status === "success") {
    return (
      <div className="border border-[#f3eadb]/12 bg-black/30 p-8 text-[#f8f0e3]">
        <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58">
          Enquiry sent
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
          Thanks, we got your message.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[#f3eadb]/62">
          We will get back to you soon. If you need to send another enquiry,
          start a fresh request below.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-7 rounded-md border border-[#f3eadb]/18 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8f0e3] transition duration-300 hover:border-[#d7c7ad]/55 hover:bg-[#f3eadb]/8"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" autoComplete="off">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Name</span>
          <input
            name="name"
            defaultValue={state.values?.name ?? ""}
            required
            type="text"
            maxLength={120}
            className={fieldClass}
            placeholder="Your name"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            name="email"
            defaultValue={state.values?.email ?? ""}
            required
            type="email"
            maxLength={254}
            className={fieldClass}
            placeholder="you@example.com"
            autoComplete="off"
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Subject</span>
        <input
          name="subject"
          defaultValue={state.values?.subject ?? ""}
          required
          type="text"
          maxLength={160}
          className={fieldClass}
          placeholder="Ticket question, booking enquiry, or general message"
          autoComplete="off"
        />
      </label>

      <label className="block">
        <span className={labelClass}>Message</span>
        <textarea
          name="message"
          defaultValue={state.values?.message ?? ""}
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          className={`${fieldClass} resize-none leading-6`}
          placeholder="Tell us what you need help with."
          autoComplete="off"
        />
      </label>

      {!isPending && state.status === "error" && state.error ? (
        <div
          role="alert"
          className="w-full border border-red-400/18 bg-red-950/18 py-[11px] px-4 rounded-md text-center md:hidden"
        >
          <p className="leading-6 text-red-400 text-sm">
            {state.error} Please try again.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between h-11 md:h-12">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
        >
          {isPending ? "Sending..." : "Send message"}
        </button>
        {!isPending && state.status === "error" && state.error ? (
          <div
            role="alert"
            className="max-w-[60%] border border-red-400/18 bg-red-950/18 py-[11px] px-4 rounded-md text-center hidden md:block"
          >
            <p className="leading-6 text-red-400 text-sm">
              {state.error} Please try again.
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
