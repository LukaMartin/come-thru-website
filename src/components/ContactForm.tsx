"use client";

import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type ContactResponse = {
  error?: string;
  fieldErrors?: Partial<Record<keyof FormState, string[]>>;
};

const initialForm: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const submission: FormState = {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      };

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      const payload = (await response.json()) as ContactResponse;

      if (!response.ok) {
        const fieldError = Object.values(payload.fieldErrors ?? {}).flat()[0];

        throw new Error(fieldError ?? payload.error ?? "Unable to send your message.");
      }

      setForm(initialForm);
      setStatus("success");
    } catch (sendError) {
      setStatus("error");
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send your message.",
      );
    }
  }

  const isLoading = status === "loading";
  const labelClass =
    "text-[0.65rem] uppercase tracking-[0.32em] text-[#d7c7ad]/58";
  const fieldClass =
    "mt-2 w-full border border-[#f3eadb]/12 bg-black/30 px-4 py-3 text-sm text-[#f8f0e3] outline-none transition duration-300 placeholder:text-[#f3eadb]/30 focus:border-[#d7c7ad]/60";

  if (status === "success") {
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
          onClick={() => {
            setStatus("idle");
            setError(null);
          }}
          className="mt-7 rounded-full border border-[#f3eadb]/18 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8f0e3] transition duration-300 hover:border-[#d7c7ad]/55 hover:bg-[#f3eadb]/8"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Name</span>
          <input
            required
            type="text"
            maxLength={120}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={fieldClass}
            placeholder="Your name"
            autoComplete="new-password"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            required
            type="email"
            maxLength={254}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className={fieldClass}
            placeholder="you@example.com"
            autoComplete="new-password"
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Subject</span>
        <input
          required
          type="text"
          maxLength={160}
          value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value })}
          className={fieldClass}
          placeholder="Ticket question, booking enquiry, or general message"
          autoComplete="new-password"
        />
      </label>

      <label className="block">
        <span className={labelClass}>Message</span>
        <textarea
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          className={`${fieldClass} resize-none leading-6`}
          placeholder="Tell us what you need help with."
          autoComplete="new-password"
        />
      </label>

      {error ? (
        <div
          role="alert"
          className="border border-red-300/18 bg-red-950/18 px-4 py-3 text-sm text-[#f8f0e3]"
        >
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-red-200/60">
            Message not sent
          </p>
          <p className="mt-1 leading-6 text-[#f3eadb]/78">{error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-full bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition duration-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
      >
        {isLoading ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
