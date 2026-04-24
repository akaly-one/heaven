/**
 * PublicFooter — Footer persistant pour pages publiques fan Heaven
 * BRIEF-10 TICKET-AG03
 * A11y: WCAG 2.2 AA, touch target ≥ 44px, focus-visible ring visible.
 */

export default function PublicFooter() {
  return (
    <footer
      role="contentinfo"
      className="w-full border-t mt-auto"
      style={{
        background: "#0a0a0b",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-3xl mx-auto px-5 py-6 md:py-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Links row */}
        <nav
          aria-label="Liens légaux"
          className="flex flex-wrap gap-x-4 gap-y-2 text-xs md:text-[13px]"
        >
          <a
            href="/privacy"
            className="no-underline transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-md px-1 py-2 inline-flex items-center"
            style={{
              color: "rgba(255,255,255,0.72)",
              minHeight: "44px",
            }}
          >
            Confidentialité
          </a>
          <a
            href="/terms"
            className="no-underline transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-md px-1 py-2 inline-flex items-center"
            style={{
              color: "rgba(255,255,255,0.72)",
              minHeight: "44px",
            }}
          >
            Conditions
          </a>
          <a
            href="/data-deletion"
            className="no-underline transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-md px-1 py-2 inline-flex items-center"
            style={{
              color: "rgba(255,255,255,0.72)",
              minHeight: "44px",
            }}
          >
            Suppression données
          </a>
          <a
            href="mailto:yumiiiclub@gmail.com"
            className="no-underline transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-md px-1 py-2 inline-flex items-center"
            style={{
              color: "rgba(255,255,255,0.72)",
              minHeight: "44px",
            }}
          >
            Contact
          </a>
        </nav>

        {/* Right block: copyright + 18+ */}
        <div className="flex flex-col gap-1 text-left md:text-right">
          <span
            className="text-[11px] md:text-xs"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            © 2026 Yumi
          </span>
          <span
            className="text-[10px] md:text-[11px] leading-snug"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Plateforme exclusive 18+ — contenu réservé adultes
          </span>
        </div>
      </div>
    </footer>
  );
}
