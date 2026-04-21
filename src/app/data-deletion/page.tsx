import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Request — Yumi · Heaven",
  description: "Request deletion of your personal data from Yumi-AI (Meta/Instagram + web).",
};

export default function DataDeletionPage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-10 md:py-16 text-neutral-200" style={{ background: "#0a0a0b", minHeight: "100vh" }}>
      <div className="flex items-center gap-3 mb-8">
        <a href="/m/yumi" className="text-sm opacity-60 hover:opacity-100 no-underline" style={{ color: "#E84393" }}>← Yumi</a>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Data Deletion Request</h1>
      <p className="text-sm opacity-60 mb-8">GDPR Art. 17 · Meta Platform Terms · Last updated April 21, 2026</p>

      <section className="space-y-6 text-sm md:text-base leading-relaxed">
        <p>
          You can request deletion of all personal data associated with your account on Yumi-AI
          (<code>https://heaven-os.vercel.app</code>). This includes:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your handles (Instagram @, Snapchat, Fanvue, web pseudo)</li>
          <li>All messages exchanged (web chat + Instagram DMs forwarded via Meta webhook)</li>
          <li>Purchase history and access codes</li>
          <li>Instagram user ID and username stored via Meta Graph API</li>
        </ul>

        <h2 className="text-xl font-semibold text-white pt-4">Two ways to request deletion</h2>

        <div className="p-5 rounded-xl" style={{ background: "#17171a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-semibold mb-2 text-white">Option 1 — By email (fastest)</h3>
          <p>
            Email us at <a href="mailto:yumiiiclub@gmail.com?subject=Data%20Deletion%20Request" className="underline" style={{ color: "#E84393" }}>
              yumiiiclub@gmail.com
            </a>{" "}
            with the subject <em>&quot;Data Deletion Request&quot;</em> and include your Instagram handle or other identifiers.
            We confirm receipt within 24h and complete deletion within <strong>30 days</strong> (GDPR).
          </p>
        </div>

        <div className="p-5 rounded-xl" style={{ background: "#17171a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-semibold mb-2 text-white">Option 2 — Automated API (for Meta App Review compliance)</h3>
          <p>Meta and developers can hit our automated deletion endpoint:</p>
          <pre className="text-xs mt-3 p-3 rounded overflow-x-auto" style={{ background: "#0a0a0b", color: "#a8b4ff" }}>
{`POST https://heaven-os.vercel.app/api/meta/data-deletion

Body (Meta signed request format):
{
  "signed_request": "<HMAC-signed payload from Meta>"
}

Or manual / end-user format:
{
  "ig_username": "your_instagram_handle",
  "email": "optional",
  "reason": "optional"
}

Response (success):
{
  "url": "https://heaven-os.vercel.app/data-deletion/status?code=<confirmation_code>",
  "confirmation_code": "<unique_code>"
}`}
          </pre>
          <p className="mt-3 text-xs opacity-70">
            The <code>url</code> and <code>confirmation_code</code> are returned to Meta per the Instagram Platform Data Deletion callback spec.
            You can visit the <code>url</code> to check the status of your deletion request.
          </p>
        </div>

        <h2 className="text-xl font-semibold text-white pt-4">What happens next</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>We log your request and assign a confirmation code</li>
          <li>Within 30 days, all personal data is soft-deleted (marked deleted, not purged) for audit trail</li>
          <li>After 90 days, data is permanently purged (except payment records held 10 years per EU accounting law)</li>
          <li>We notify you via email when deletion is complete</li>
        </ol>

        <h2 className="text-xl font-semibold text-white pt-4">Questions</h2>
        <p>
          <a href="mailto:yumiiiclub@gmail.com" className="underline" style={{ color: "#E84393" }}>yumiiiclub@gmail.com</a>
          {" "}· See also our <a href="/privacy" className="underline" style={{ color: "#E84393" }}>Privacy Policy</a>.
        </p>

      </section>

      <footer className="pt-10 mt-10 border-t border-white/10 text-xs opacity-50">
        © 2026 Yumi · Heaven. Content creator platform.
      </footer>
    </main>
  );
}
