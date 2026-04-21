import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deletion Status — Yumi · Heaven",
};

// Public status page shown by the URL returned to Meta in /api/meta/data-deletion
export default async function DeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const sp = await searchParams;
  const code = sp.code || "";

  return (
    <main className="max-w-2xl mx-auto px-5 py-10 md:py-16 text-neutral-200" style={{ background: "#0a0a0b", minHeight: "100vh" }}>
      <div className="flex items-center gap-3 mb-8">
        <a href="/m/yumi" className="text-sm opacity-60 hover:opacity-100 no-underline" style={{ color: "#E84393" }}>← Yumi</a>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Deletion in progress</h1>
      <p className="text-sm opacity-60 mb-8">Confirmation code : <code>{code || "—"}</code></p>

      <section className="space-y-4 text-sm md:text-base leading-relaxed">
        <div className="p-5 rounded-xl" style={{ background: "#17171a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="font-semibold text-white mb-2">Your data deletion request has been received ✓</p>
          <p>
            We are processing the request. Within 30 days, all personal data associated with this identifier will be anonymized.
            Within 90 days, it will be permanently purged (except financial records held per EU accounting law).
          </p>
          <p className="mt-3">
            You will receive a confirmation email at the address you provided (if any) when the deletion is complete.
            Keep the confirmation code above for reference.
          </p>
        </div>

        <p className="text-xs opacity-60">
          Need help? <a href="mailto:yumiiiclub@gmail.com" className="underline" style={{ color: "#E84393" }}>yumiiiclub@gmail.com</a>
        </p>
      </section>

      <footer className="pt-10 mt-10 border-t border-white/10 text-xs opacity-50">
        © 2026 Yumi · Heaven.
      </footer>
    </main>
  );
}
