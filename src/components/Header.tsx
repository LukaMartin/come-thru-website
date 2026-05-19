"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import logoCream from "../../public/logo-cream.png";

const navLinks = [
  { href: "/tickets", label: "Tickets" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 -mx-5 border-b border-[#f3eadb]/12 bg-[#070605]/96 px-5 py-6 text-sm text-[#f3eadb]/58 backdrop-blur sm:-mx-6 sm:px-6 md:relative md:mx-0 md:px-0 md:py-8">
      <div className="relative z-50 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-4 text-sm font-semibold uppercase tracking-[0.36em] text-[#f8f0e3]"
          onClick={() => setIsOpen(false)}
        >
          <Image
            src={logoCream}
            alt="Come Thru Logo"
            width={100}
            height={100}
            className="h-[55px] w-auto md:h-[70px]"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-[0.8rem] font-medium uppercase tracking-[0.28em] transition duration-300 hover:text-[#f8f0e3]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="flex size-10 flex-col items-center justify-center gap-1.5 text-white transition hover:border-white/30 md:hidden"
        >
          <span
            className={`h-px w-4 bg-current transition duration-300 ${
              isOpen ? "translate-y-[3px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-px w-4 bg-current transition duration-300 ${
              isOpen ? "translate-y-[-4px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      <nav
        className={`fixed inset-0 z-40 flex h-dvh w-screen flex-col justify-center bg-[#070605] px-6 text-right transition duration-300 ease-out md:hidden ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col items-end gap-6 text-4xl font-black uppercase tracking-tight text-[#f8f0e3]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="transition hover:text-fuchsia-200"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
