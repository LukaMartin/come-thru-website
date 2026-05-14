import { SUPPORT_EMAIL } from "@/lib/site";

export const faqItems = [
  {
    question: "When will I receive my ticket?",
    answer:
      "Your ticket is emailed shortly after checkout is completed. It includes a PDF with a unique QR code for entry. If you bought multiple tickets, each ticket will be on a seperate page in the PDF.",
  },
  {
    question: "What if I cannot find my ticket?",
    answer: `Check spam, junk, and any inbox tabs first. If it still has not arrived, email ${SUPPORT_EMAIL} with the email address used at checkout and we can look it up.`,
  },
  {
    question: "Can I get a refund?",
    answer:
      "Refunds are only available if the event is cancelled, the event is rescheduled, or where required by Australian Consumer Law. Refunds are not granted for incorrect purchases, change of mind, or personal circumstances preventing you from attending.",
  },
  {
    question: "Can I transfer my ticket to someone else?",
    answer:
      "Yes, unless a specific event says otherwise. The ticket QR code can only be scanned once, so only send it to someone you trust.",
  },
  {
    question: "Do I need ID?",
    answer:
      "Bring valid photo ID, especially for 18+ events. Entry is still subject to venue rules, licensing requirements, and security checks.",
  },
  {
    question: "Are there door sales?",
    answer:
      "Door sales depend on capacity and are not guaranteed. Buying online is the safest way to lock in entry.",
  },
];
