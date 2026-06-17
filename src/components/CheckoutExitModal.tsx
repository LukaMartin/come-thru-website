"use client";

import { CheckoutExitReason } from "@/lib/checkout";
import { cancelCheckoutReservationClient } from "@/lib/checkout";
import { useRouter } from "next/navigation";

type CheckoutExitModalProps = {
  reason: CheckoutExitReason;
  orderId: string;
  isAlreadyCancelled?: boolean;
};

export default function CheckoutExitModal({
  reason,
  orderId,
  isAlreadyCancelled = false,
}: CheckoutExitModalProps) {
  const router = useRouter();

  const copy =
    reason === "unavailable"
      ? {
          title: "Checkout unavailable",
          message:
            "This checkout is no longer available. Please start again to purchase tickets.",
        }
      : {
          title: "Reservation expired",
          message:
            "Your 10 minute ticket reservation has ended. Please start again to purchase tickets.",
        };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm"
      role="dialog"
    >
      <div className="bg-[#070605] relative w-full max-w-lg overflow-hidden border border-[#f3eadb]/16 p-6 text-center shadow-2xl shadow-black/50 md:p-8">
        <p className="text-[0.8rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
          {copy.title}
        </p>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-[#f3eadb]/68 md:text-base md:leading-7">
          {copy.message}
        </p>
        <button
          onClick={async (e) => {
            e.preventDefault();
            if (!isAlreadyCancelled) {
              await cancelCheckoutReservationClient(orderId);
            }
            router.push("/event-info?view=tickets");
          }}
          className="mt-7 inline-flex items-center justify-center rounded-md bg-[#f8f0e3] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black transition duration-300 hover:bg-white"
        >
          Start new checkout
        </button>
      </div>
    </div>
  );
}
