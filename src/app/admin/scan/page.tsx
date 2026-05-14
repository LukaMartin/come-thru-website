import { Header } from "@/components/Header";
import { ScannerPinLock } from "@/components/ScannerPinLock";
import { TicketScanner } from "@/components/TicketScanner";
import { getCurrentEvent } from "@/lib/events";
import { isScannerAuthenticated } from "@/lib/scanner-auth";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const isAuthenticated = await isScannerAuthenticated();
  const event = await getCurrentEvent();

  if (!isAuthenticated) {
    return (
      <main className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 text-[#f8f0e3] sm:px-6">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
          <ScannerPinLock />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#050505] px-5 text-[#f8f0e3] sm:px-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.045)_0_1px,transparent_1px_18px)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8">
        <Header />

        <header className="relative overflow-hidden border-y border-[#f3eadb]/14 bg-[radial-gradient(circle_at_18%_18%,rgba(172,67,43,0.18),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(215,199,173,0.08),transparent_30%),radial-gradient(circle_at_64%_82%,rgba(242,171,82,0.08),transparent_32%),rgba(8,7,6,0.9)] p-5 shadow-2xl shadow-black/30 md:border md:p-8">
          <div className="pointer-events-none absolute -left-16 top-12 h-52 w-52 rounded-full bg-[#b5482f]/12 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-8 h-48 w-48 rounded-full bg-[#d7c7ad]/8 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-4">
              <p className="text-[0.68rem] uppercase tracking-[0.45em] text-[#d7c7ad]">
                Admin
              </p>
              <span className="h-px w-10 bg-[#d7c7ad]/35" />
            </div>
            <h1 className="mt-6 max-w-3xl text-[clamp(3rem,13vw,6rem)] font-black uppercase leading-[0.88] tracking-[-0.06em]">
              Scan tickets
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#f3eadb]/68 md:text-lg md:leading-8">
              Scan each QR once. A green response means the ticket was redeemed
              successfully. Yellow/red means there was an issue with the ticket.
              Please check the response for more details.
            </p>
          </div>
        </header>

        {event ? (
          <TicketScanner eventId={event.id} eventName={event.name} />
        ) : null}
      </div>
    </main>
  );
}
