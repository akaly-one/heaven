import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Yumi · Heaven",
  description: "Conditions d'utilisation de Yumi (heaven-os.vercel.app).",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-10 md:py-16 text-neutral-200" style={{ background: "#0a0a0b", minHeight: "100vh" }}>
      <div className="flex items-center gap-3 mb-8">
        <a href="/m/yumi" className="text-sm opacity-60 hover:opacity-100 no-underline" style={{ color: "#E84393" }}>← Yumi</a>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Terms of Service</h1>
      <p className="text-sm opacity-60 mb-8">Last updated: April 21, 2026 · Yumi-AI App</p>

      <section className="space-y-6 text-sm md:text-base leading-relaxed">

        <h2 className="text-xl font-semibold text-white pt-4">1. Acceptance</h2>
        <p>
          By using the Yumi-AI service (hosted at <code>https://heaven-os.vercel.app</code>), you accept these Terms of Service
          and our <a href="/privacy" className="underline" style={{ color: "#E84393" }}>Privacy Policy</a>. If you do not agree, do not use the service.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">2. Age requirement</h2>
        <p>
          You must be <strong>at least 18 years old</strong> to access, view, or purchase any content on this platform.
          The content is intended for adults only. By accessing Yumi-AI, you certify under penalty of perjury that you are 18 or older.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">3. Nature of the service</h2>
        <p>
          Yumi-AI is a content delivery platform for the adult digital creator <strong>Yumi</strong> (<a href="https://instagram.com/yumiiiclub" className="underline" style={{ color: "#E84393" }}>@yumiiiclub</a>).
          It allows registered visitors to view content (free public tier or paid premium tiers unlocked via access codes), exchange messages with the creator,
          and purchase packs via PayPal or Revolut.
        </p>
        <p>
          Some conversations may be assisted by an AI agent acting on behalf of the creator. When an AI is used, the reply is validated by the creator
          before being sent (review mode) or auto-sent with the creator&apos;s consent (auto mode). The persona is explicitly that of Yumi; the AI does not impersonate a third party.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">4. User conduct</h2>
        <p>You agree to NOT:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Redistribute, copy, resell, or publish content obtained via access codes</li>
          <li>Record, screenshot, or screencap content (screenshot detection is active and logs such events)</li>
          <li>Harass the creator, issue threats, or send unsolicited explicit content</li>
          <li>Attempt to bypass tier restrictions, payment flows, or access codes by automated means</li>
          <li>Use the service to promote competing platforms</li>
          <li>Impersonate others (false handles, stolen Instagram usernames)</li>
          <li>Scrape, reverse-engineer, or denial-of-service the platform</li>
        </ul>
        <p>
          Violation = immediate and permanent ban, forfeiture of active subscriptions without refund, and potential legal action.
          We reserve the right to ban any account at our sole discretion for conduct we deem abusive.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">5. Content ownership</h2>
        <p>
          All content (photos, videos, messages authored by the creator) is the exclusive intellectual property of Yumi.
          Granting you access via an access code gives you a <strong>personal, non-transferable, non-commercial license to view</strong>
          {" "}the content for the duration of your subscription. Any other use requires explicit written permission.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">6. Purchases and refunds</h2>
        <p>
          All purchases are final and non-refundable once content has been unlocked, per EU Consumer Rights Directive Art. 16(m)
          (digital content delivered after explicit consent to waive the 14-day withdrawal right).
        </p>
        <p>
          If a technical error prevents access to purchased content, contact <a href="mailto:yumiiiclub@gmail.com" className="underline" style={{ color: "#E84393" }}>yumiiiclub@gmail.com</a> within 7 days
          — we will investigate and either restore access or issue a refund via the original payment method.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">7. AI-assisted conversations disclosure</h2>
        <p>
          Per the EU AI Act (effective August 2026) and the 2024 California AB-2602, we disclose that some messages sent to you may be drafted
          by a generative AI system operating on behalf of the creator. This AI is trained and supervised by Yumi, and all communications
          reflect her persona and intent. The AI does not make autonomous decisions about payments or account access.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">8. Disclaimer of warranties</h2>
        <p>
          The service is provided <em>&quot;as is&quot;</em> without warranty of any kind. We do not guarantee uninterrupted availability, specific response times from the creator,
          or the accuracy of any automated reply. Use of third-party platforms (Instagram, PayPal, etc.) is subject to their terms.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">9. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Yumi-AI&apos;s total liability to you for any claim arising out of the service shall not exceed
          the amount you paid in the 12 months preceding the claim. We are not liable for indirect, incidental, consequential, or punitive damages.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">10. Governing law and jurisdiction</h2>
        <p>
          These Terms are governed by the laws of Belgium (seat of the operator). Any dispute shall be submitted to the competent courts of Brussels,
          without prejudice to consumer protection provisions of your country of residence (within the EU).
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">11. Changes to these Terms</h2>
        <p>
          We may update these Terms. Material changes will be notified via a banner. Continued use of the service after notification
          constitutes acceptance. You may terminate your account at any time if you disagree.
        </p>

        <h2 className="text-xl font-semibold text-white pt-4">12. Contact</h2>
        <p>
          <a href="mailto:yumiiiclub@gmail.com" className="underline" style={{ color: "#E84393" }}>yumiiiclub@gmail.com</a>
        </p>

      </section>

      <footer className="pt-10 mt-10 border-t border-white/10 text-xs opacity-50">
        © 2026 Yumi · Heaven. Content creator platform.
      </footer>
    </main>
  );
}
