import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Yumi · Heaven",
  description: "Politique de confidentialité de Yumi (heaven-os.vercel.app) — RGPD compliant.",
};

// Public page — no auth required. Must be reachable for Meta App Review.
export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-10 md:py-16 text-neutral-200" style={{ background: "#0a0a0b", minHeight: "100vh" }}>
      <div className="flex items-center gap-3 mb-8">
        <a href="/m/yumi" className="text-sm opacity-60 hover:opacity-100 no-underline" style={{ color: "#E84393" }}>← Yumi</a>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Privacy Policy</h1>
      <p className="text-sm opacity-60 mb-8">Last updated: April 21, 2026 · Yumi-AI App (heaven-os.vercel.app)</p>

      <section className="space-y-6 text-sm md:text-base leading-relaxed">

        <h2 className="text-xl font-semibold text-white pt-4">1. Who we are</h2>
        <p>
          This service is operated by <strong>Yumi-AI</strong>, a digital creator platform owned and maintained by
          the content creator known as <strong>Yumi</strong> (Instagram <a href="https://instagram.com/yumiiiclub" className="underline" style={{ color: "#E84393" }}>@yumiiiclub</a>).
          Platform hosted at <code>https://heaven-os.vercel.app</code>.
          Contact: <a href="mailto:yumiiiclub@gmail.com" className="underline" style={{ color: "#E84393" }}>yumiiiclub@gmail.com</a>
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">2. Data we collect</h2>
        <p>We collect the minimum data necessary to provide our service:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Handles</strong>: Instagram / Snapchat / Fanvue usernames you voluntarily provide when visiting a creator profile</li>
          <li><strong>Messages</strong>: conversations you exchange with the creator through the platform (web chat or via Instagram DMs if you interact with @yumiiiclub)</li>
          <li><strong>Purchase history</strong>: packs you unlock via access codes, amounts paid via PayPal or Revolut</li>
          <li><strong>Technical data</strong>: IP address (for rate limiting and fraud prevention), browser type, session cookies (HTTP-only, signed JWT, 24h expiry)</li>
          <li><strong>Instagram data</strong>: when you DM @yumiiiclub, Meta forwards the message + your Instagram user ID + username to our webhook — we store this to let the creator reply</li>
        </ul>
        <p>We do <strong>not</strong> collect: government ID, banking details (handled by PayPal/Revolut), biometric data, location beyond country-level IP geolocation, or phone contacts.</p>

        <h2 className="text-xl font-semibold text-white pt-4">3. Legal basis (GDPR)</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Consent</strong>: you actively provide your handle on the identity gate before accessing any content</li>
          <li><strong>Contract</strong>: processing necessary to deliver paid content/packs you purchase</li>
          <li><strong>Legitimate interest</strong>: security (rate limiting, fraud detection), analytics (anonymized), direct reply to DMs you initiate</li>
        </ul>

        <h2 className="text-xl font-semibold text-white pt-4">4. How we use your data</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Deliver subscribed / purchased content</li>
          <li>Reply to your messages (manually by the creator or assisted by an AI agent in "review" mode, with the creator validating each response)</li>
          <li>Detect spam and abuse</li>
          <li>Calculate anonymized stats (total DM volume, tier distribution) — never shared individually</li>
          <li>Send a one-time welcome message on Instagram when you first DM the creator, if you have registered your handle on our site (opt-in via gate)</li>
        </ul>
        <p>We do <strong>not</strong>: sell or rent your data to third parties, send cross-promotional marketing from other brands, train external AI models on your messages.</p>

        <h2 className="text-xl font-semibold text-white pt-4">5. Data sharing</h2>
        <p>Your data is shared only with the following processors, strictly for the purposes above:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Supabase</strong> (EU/US) — database hosting</li>
          <li><strong>Vercel</strong> (US/EU edge) — application hosting</li>
          <li><strong>Cloudinary</strong> (US) — media storage and delivery</li>
          <li><strong>Meta Platforms Inc.</strong> (Instagram Graph API) — only when you initiate contact with @yumiiiclub on Instagram</li>
          <li><strong>PayPal / Revolut</strong> — only during payment processing (we never see your card details)</li>
          <li><strong>OpenRouter / Anthropic</strong> (AI reply generation) — messages sent only if the AI agent is enabled; you'll be notified in the conversation header</li>
          <li><strong>PostHog</strong> (EU region) — anonymized product analytics</li>
        </ul>

        <h2 className="text-xl font-semibold text-white pt-4">6. Data retention</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Profile (handle, purchases): as long as your account is active. You can request deletion at any time</li>
          <li>Messages: 12 months by default, then archived in anonymized form</li>
          <li>Payment records: 10 years (French / EU accounting obligation)</li>
          <li>Session cookies: 24 hours, automatic</li>
          <li>Operational metrics (latency, API calls): 7 days</li>
        </ul>

        <h2 className="text-xl font-semibold text-white pt-4">7. Your rights (GDPR Art. 15-22)</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Erase your data ("right to be forgotten")</li>
          <li>Restrict or object to processing</li>
          <li>Data portability (receive your data in a common format)</li>
          <li>Lodge a complaint with a supervisory authority (CNIL in France, your local DPA otherwise)</li>
        </ul>
        <p>
          To exercise these rights, email <a href="mailto:yumiiiclub@gmail.com" className="underline" style={{ color: "#E84393" }}>yumiiiclub@gmail.com</a>
          {" "}or use our automated deletion endpoint: <code>POST https://heaven-os.vercel.app/api/meta/data-deletion</code>.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">8. Instagram / Meta data deletion</h2>
        <p>
          If you want us to delete all data associated with your Instagram account that we obtained via Meta&apos;s Graph API (DMs, username, Instagram user ID), submit a request at our{" "}
          <a href="/data-deletion" className="underline" style={{ color: "#E84393" }}>data deletion page</a>
          {" "}or the Meta Accounts Center. We will process the request within 30 days per Meta Platform Terms.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">9. Security</h2>
        <p>
          We use HTTPS only, HttpOnly signed session cookies, row-level security (RLS) policies on our database,
          rate limiting on all authenticated endpoints, and encrypted storage of API tokens. We do not store
          passwords in plaintext (session-based auth). Payment data is handled exclusively by PayPal and Revolut.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">10. Minors</h2>
        <p>
          Our service is intended for adults (<strong>18+ only</strong>). If you are under 18, do not use this service.
          If we learn we have collected personal data from a minor, we will delete it immediately.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">11. International transfers</h2>
        <p>
          Some processors (Vercel, Cloudinary, Meta) may transfer data outside the EU. Transfers are covered by
          Standard Contractual Clauses (SCCs) approved by the European Commission.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">12. Changes to this policy</h2>
        <p>
          We may update this policy. Material changes will be notified via a banner on the service. The &quot;last updated&quot; date
          at the top reflects the current version.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">13. Contact</h2>
        <p>
          Any question? Reach us at{" "}
          <a href="mailto:yumiiiclub@gmail.com" className="underline" style={{ color: "#E84393" }}>yumiiiclub@gmail.com</a>.
        </p>

      </section>

      <footer className="pt-10 mt-10 border-t border-white/10 text-xs opacity-50">
        © 2026 Yumi · Heaven. Content creator platform.
      </footer>
    </main>
  );
}
