import type { Metadata } from "next";
import PublicFooter from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Yumi",
  description:
    "Politique de confidentialité de Yumi — plateforme de messagerie privée pour adultes (18+). Conforme RGPD.",
};

// Public page — no auth required. Conforme RGPD.
export default function PrivacyPage() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "#0a0a0b" }}
    >
      <main
        className="flex-1 max-w-3xl mx-auto w-full px-5 py-10 md:py-16 text-neutral-200"
      >
        <div className="flex items-center gap-3 mb-8">
          <a
            href="/m/yumi"
            className="text-sm opacity-60 hover:opacity-100 no-underline focus-visible:outline-none focus-visible:ring-2 rounded px-2 py-1"
            style={{ color: "#E84393" }}
          >
            ← Retour
          </a>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
          Politique de confidentialité
        </h1>
        <p className="text-sm opacity-60 mb-10">
          Dernière mise à jour : 24 avril 2026 · Yumi (heaven-os.vercel.app)
        </p>

        <section className="space-y-7 text-sm md:text-base leading-relaxed">
          {/* 1 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Responsable de traitement
            </h2>
            <p>
              Le présent service est opéré par{" "}
              <strong>Yumi</strong>, créatrice de contenus adultes, via la
              plateforme <strong>Heaven OS</strong> accessible à l&apos;adresse{" "}
              <code>heaven-os.vercel.app</code>.
            </p>
            <p className="mt-2">
              Contact :{" "}
              <a
                href="mailto:yumiiiclub@gmail.com"
                className="underline focus-visible:outline-none focus-visible:ring-2 rounded"
                style={{ color: "#E84393" }}
              >
                yumiiiclub@gmail.com
              </a>
            </p>
          </div>

          {/* 2 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Données collectées
            </h2>
            <p className="mb-2">
              Nous ne collectons que les données strictement nécessaires au
              fonctionnement du service :
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Identifiants visiteur</strong> : pseudo visiteur généré
                automatiquement à la première visite, handles Snapchat /
                Instagram / Fanvue optionnellement fournis par le visiteur
              </li>
              <li>
                <strong>Messages</strong> : contenu des conversations échangées
                avec Yumi via la messagerie intégrée
              </li>
              <li>
                <strong>Préférences</strong> : tags de goûts et d&apos;envies
                extraits du contenu des conversations pour personnaliser le
                contenu proposé par la créatrice (market research — BRIEF-09)
              </li>
              <li>
                <strong>Données techniques</strong> : adresse IP hashée (subnet
                /24 — non-réversible), User-Agent hashé, horodatages des
                événements (certification d&apos;âge, connexion, messages)
              </li>
            </ul>
            <p className="mt-3 opacity-80">
              Nous ne collectons <strong>pas</strong> : pièce d&apos;identité,
              coordonnées bancaires (traitées par PayPal / Revolut), données
              biométriques, géolocalisation fine, contacts du téléphone.
            </p>
          </div>

          {/* 3 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Base légale (art. 6 RGPD)
            </h2>
            <p>
              Le traitement de vos données repose sur votre{" "}
              <strong>consentement explicite</strong> (art. 6.1.a RGPD), fourni
              au moment du passage de l&apos;age gate et de la certification
              sur l&apos;honneur de votre majorité (18 ans révolus).
            </p>
            <p className="mt-2">
              Ce consentement est révocable à tout moment via le lien de
              suppression de données (voir §6).
            </p>
          </div>

          {/* 4 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Finalités du traitement
            </h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Fourniture du service de messagerie</strong> avec la
                créatrice
              </li>
              <li>
                <strong>Personnalisation du contenu</strong> produit par la
                créatrice, sur la base d&apos;agrégats anonymisés de
                préférences (market research interne)
              </li>
              <li>
                <strong>Protection des mineurs</strong> via age gate
                obligatoire et détection d&apos;anomalies (âge déclaré, langue,
                contexte)
              </li>
              <li>
                <strong>Sécurité et lutte contre la fraude</strong> :
                rate-limiting, détection d&apos;abus, audit logs
              </li>
            </ul>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Durée de conservation
            </h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Conversations</strong> : conservées pendant 1 an à
                compter du dernier échange, puis anonymisées (suppression de
                tout identifiant personnel tout en gardant le contenu agrégé
                pour statistiques)
              </li>
              <li>
                <strong>Insights préférences</strong> : 1 an puis suppression
                complète
              </li>
              <li>
                <strong>Logs age gate</strong> : 5 ans (obligation légale de
                traçabilité — protection mineurs)
              </li>
              <li>
                <strong>Cookies de session</strong> : 30 jours pour la
                certification d&apos;âge, expiration automatique au-delà
              </li>
            </ul>
          </div>

          {/* 6 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Vos droits (art. 15-22 RGPD)
            </h2>
            <p className="mb-2">Vous disposez à tout moment du droit :</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>D&apos;accès</strong> — obtenir une copie des données
                vous concernant via{" "}
                <a
                  href="/data-deletion"
                  className="underline"
                  style={{ color: "#E84393" }}
                >
                  /data-deletion/status
                </a>
              </li>
              <li>
                <strong>De rectification</strong> — corriger une donnée
                inexacte via le support
              </li>
              <li>
                <strong>De suppression</strong> (&laquo; droit à
                l&apos;oubli &raquo;) — via{" "}
                <a
                  href="/data-deletion"
                  className="underline"
                  style={{ color: "#E84393" }}
                >
                  /data-deletion
                </a>
              </li>
              <li>
                <strong>À la portabilité</strong> — export complet de vos
                données au format JSON sur demande
              </li>
              <li>
                <strong>D&apos;opposition</strong> — bouton dédié dans
                l&apos;interface fan pour refuser le traitement de vos
                préférences
              </li>
              <li>
                <strong>De plainte</strong> auprès de l&apos;autorité de
                contrôle compétente (CNIL en France, APD en Belgique)
              </li>
            </ul>
          </div>

          {/* 7 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Contact DPO
            </h2>
            <p>
              Pour toute question relative au traitement de vos données ou pour
              exercer vos droits, contactez notre délégué à la protection des
              données :{" "}
              <a
                href="mailto:privacy@heaven-os.vercel.app"
                className="underline"
                style={{ color: "#E84393" }}
              >
                privacy@heaven-os.vercel.app
              </a>
            </p>
            <p className="mt-2 text-xs opacity-70">
              Délai de réponse : 30 jours maximum (art. 12 RGPD).
            </p>
          </div>

          {/* 8 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Absence de partage commercial
            </h2>
            <p>
              Vos données restent strictement <strong>in-house</strong> Heaven
              (hébergement Supabase UE). Nous{" "}
              <strong>ne vendons pas</strong> vos données, nous{" "}
              <strong>ne les partageons pas</strong> à des tiers marketing, et
              nous <strong>ne les utilisons pas</strong> pour entraîner des
              modèles d&apos;IA externes.
            </p>
            <p className="mt-2">
              Les seuls sous-traitants techniques sont : Supabase (DB UE),
              Vercel (edge runtime), Cloudinary (médias), et les fournisseurs
              LLM activés au cas par cas (Groq, OpenRouter) pour la génération
              assistée des réponses de la créatrice.
            </p>
          </div>

          {/* 9 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Cookies
            </h2>
            <p>Nous utilisons uniquement des cookies essentiels :</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                <strong>Session d&apos;authentification</strong> (cookie signé
                HttpOnly, 24h)
              </li>
              <li>
                <strong>Certification d&apos;âge</strong> (cookie persistant
                local 30 jours, ne contient que le statut certifié/non)
              </li>
            </ul>
            <p className="mt-2 opacity-80">
              Aucun cookie tiers publicitaire, aucun tracker cross-site, aucune
              analyse comportementale externe.
            </p>
          </div>

          {/* 10 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Sécurité
            </h2>
            <p>Vos données sont protégées par plusieurs mesures techniques :</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                <strong>Chiffrement at rest</strong> : base de données Supabase
                chiffrée AES-256
              </li>
              <li>
                <strong>Chiffrement in transit</strong> : TLS 1.3 sur tous les
                endpoints
              </li>
              <li>
                <strong>Row-Level Security (RLS)</strong> : isolation stricte
                des scopes admin selon rôle
              </li>
              <li>
                <strong>Audit logs append-only</strong> : traçabilité des
                événements sensibles (age gate, validation, révocation)
              </li>
              <li>
                <strong>Rate-limiting</strong> sur toutes les routes
                authentifiées pour prévenir les abus automatisés
              </li>
            </ul>
          </div>

          {/* 11 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              11. Dernière mise à jour
            </h2>
            <p>
              Cette politique a été mise à jour le{" "}
              <strong>24 avril 2026</strong>. Toute modification substantielle
              sera notifiée via bandeau dans l&apos;interface au moment de
              votre prochaine visite. La poursuite de l&apos;utilisation du
              service après notification vaut acceptation de la version à jour.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
