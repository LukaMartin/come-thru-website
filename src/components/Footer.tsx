import Link from "next/link";
import { FaInstagram, FaSoundcloud } from "react-icons/fa";

import { socialLinks } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#f3eadb]/12 py-8 text-sm text-[#f3eadb]/52 md:py-10">
      <div className="flex justify-center items-center gap-x-5 md:gap-x-6 ">

          <a
            href={socialLinks.instagram}
            target="_blank"
            rel="noreferrer"
            aria-label="Open Come Thru on Instagram"
            className="group inline-flex items-center gap-2 transition duration-300 hover:text-[#f8f0e3]"
          >
            <FaInstagram
              aria-hidden="true"
              className="text-lg transition duration-300 group-hover:text-[#d88ca8]"
            />
            <span className="hidden sm:inline">Instagram</span>
          </a>
          <a
            href={socialLinks.soundcloud}
            target="_blank"
            rel="noreferrer"
            aria-label="Open Come Thru on SoundCloud"
            className="group inline-flex items-center gap-2 transition duration-300 hover:text-[#f8f0e3]"
          >
            <FaSoundcloud
              aria-hidden="true"
              className="text-xl transition duration-300 group-hover:text-[#ff7700]"
            />
            <span className="hidden sm:inline">SoundCloud</span>
          </a>
          <Link
            href="/terms"
            className="uppercase tracking-[0.2em] transition duration-300 hover:text-[#f8f0e3] text-xs md:text-sm"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="uppercase tracking-[0.2em] transition duration-300 hover:text-[#f8f0e3] text-xs md:text-sm"
          >
            Privacy
          </Link>
        </div>
    
    </footer>
  );
}
