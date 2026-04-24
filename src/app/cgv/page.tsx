import type { Metadata } from "next";
import PublicFooter from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente — Heaven",
  description:
    "Conditions Générales de Vente des packs Heaven : objet, prix, accès 30 jours, paiement, responsabilité pseudo, procédure correction, droit belge.",
};

// BRIEF-16 — CGV complètes packs creator (Yumi / Paloma / Ruby).
// Style aligné sur /privacy et /terms (dark theme, rose #E84393, sections hiérarchiques).
export default function CGVPage() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "#0a0a0b" }}
    >
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-10 md:py-16 text-neutral-200">
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
          Conditions Générales de Vente
        </h1>
        <p className="text-sm opacity-60 mb-10">
          Dernière mise à jour : 25 avril 2026 · Heaven (heaven-os.vercel.app)
        </p>

        <section className="space-y-7 text-sm md:text-base leading-relaxed">
          {/* 1 — Objet */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales de Vente (ci-après «&nbsp;CGV&nbsp;»)
              régissent la vente de <strong>contenus numériques</strong> (photos,
              vidéos, contenus personnalisés) par des créatrices indépendantes
              (ci-après «&nbsp;la modèle&nbsp;») opérant sur la plateforme Heaven
              (ci-après «&nbsp;la plateforme&nbsp;»), accessible à l&apos;adresse{" "}
              <code>heaven-os.vercel.app</code>, à l&apos;attention de visiteurs
              majeurs (ci-après «&nbsp;le client&nbsp;»).
            </p>
            <p className="mt-2">
              Toute commande implique l&apos;acceptation pleine et entière des
              présentes CGV, via la case à cocher explicite disponible avant
              validation du paiement. Les CGV en vigueur sont celles publiées sur
              la plateforme au moment de la commande.
            </p>
          </div>

          {/* 2 — Âge minimum */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Âge minimum
            </h2>
            <p>
              L&apos;accès à la plateforme et l&apos;achat de packs sont
              strictement réservés aux <strong>personnes majeures
              (18&nbsp;ans révolus)</strong>. Le client certifie sur
              l&apos;honneur, au passage de l&apos;age gate d&apos;entrée, qu&apos;il
              est majeur au sens de la loi applicable dans son pays de résidence.
            </p>
            <p className="mt-2">
              Toute fausse déclaration d&apos;âge entraîne la révocation
              immédiate du compte, la suppression des accès et, le cas échéant, un
              signalement aux autorités compétentes.
            </p>
          </div>

          {/* 3 — Prix */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">3. Prix</h2>
            <p>
              Les prix sont indiqués en <strong>euros (€)</strong>, toutes taxes
              comprises (TTC), conformément à la grille tarifaire affichée sur la
              plateforme au moment de la commande.
            </p>
            <p className="mt-2 mb-2">
              Packs standards :
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Silver</strong> — glamour sexy sans nudité — 50&nbsp;€
              </li>
              <li>
                <strong>Gold</strong> — poses suggestives — 100&nbsp;€
              </li>
              <li>
                <strong>VIP Black</strong> — nu sans visage — 200&nbsp;€
              </li>
              <li>
                <strong>VIP Platinum</strong> — nu avec visage — 350&nbsp;€
              </li>
              <li>
                <strong>Custom</strong> — panier à la carte (photo 5&nbsp;€ / min
                vidéo 10&nbsp;€ × multiplicateur de catégorie), total calculé
                dynamiquement avant commande
              </li>
            </ul>
            <p className="mt-3 opacity-80">
              La grille complète des tarifs custom (catégorie × type de média ×
              quantité) est affichée en temps réel dans le panier avant
              validation.
            </p>
          </div>

          {/* 4 — Durée d'accès */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Durée d&apos;accès
            </h2>
            <p>
              L&apos;accès au contenu du pack est valable{" "}
              <strong>30&nbsp;jours calendaires</strong> à compter de la
              génération du code d&apos;accès, laquelle intervient après
              validation du paiement par la modèle.
            </p>
            <p className="mt-2">
              Passé ce délai, le code expire automatiquement et ne peut plus être
              utilisé. Aucune prolongation n&apos;est due au titre de
              l&apos;inactivité du client ou d&apos;un retard de consultation du
              contenu.
            </p>
          </div>

          {/* 5 — Modes de paiement */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Modes de paiement
            </h2>
            <p>
              La plateforme propose plusieurs modes de paiement, activables ou
              désactivables par la modèle&nbsp;:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                <strong>PayPal.me (manuel)</strong> — le client est redirigé vers
                le lien PayPal.me de la modèle et colle la référence de commande
                en note
              </li>
              <li>
                <strong>PayPal Checkout (automatique)</strong> — lorsque
                disponible, capture directe avec génération du code post-webhook
              </li>
              <li>
                <strong>Revolut Merchant</strong> — paiement carte ou Apple Pay
                (lorsque activé)
              </li>
              <li>
                <strong>Stripe</strong> — uniquement activable en cas
                d&apos;urgence opérationnelle, à l&apos;initiative de
                l&apos;exploitant
              </li>
            </ul>
            <p className="mt-3 opacity-80">
              Les modes actifs au moment de la commande sont affichés
              dynamiquement dans l&apos;interface d&apos;achat. Le choix du mode
              est libre parmi ceux disponibles.
            </p>
          </div>

          {/* 6 — Processus de paiement manuel */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Processus de paiement manuel
            </h2>
            <p>
              En cas de paiement via PayPal.me manuel, le processus se déroule
              comme suit&nbsp;:
            </p>
            <ol className="list-decimal pl-6 space-y-1.5 mt-2">
              <li>
                Le client sélectionne un pack et valide les présentes CGV
              </li>
              <li>
                Une <strong>référence unique</strong> lui est fournie (par
                exemple&nbsp;: <code>YUMI-PGLD-K3M9X2</code>) qu&apos;il doit{" "}
                <strong>copier dans la note du paiement PayPal</strong>
              </li>
              <li>
                Le client est redirigé vers le lien PayPal.me de la modèle et
                effectue le virement du montant exact
              </li>
              <li>
                La modèle réceptionne le paiement, vérifie la correspondance
                référence&nbsp;/ pseudo&nbsp;/ montant, puis valide manuellement
                la commande depuis son cockpit
              </li>
              <li>
                Un <strong>code d&apos;accès strictement cloisonné au pack
                acheté</strong> est alors généré automatiquement et transmis au
                client via la messagerie interne de la plateforme
              </li>
              <li>
                Le client saisit le code dans l&apos;interface pour débloquer le
                contenu pendant 30&nbsp;jours
              </li>
            </ol>
          </div>

          {/* 7 — Responsabilité pseudo */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Responsabilité pseudonyme
            </h2>
            <p>
              Le client est <strong>seul responsable</strong> de fournir un
              pseudonyme correct, complet et <strong>identique</strong> entre
              PayPal (ou tout autre mode de paiement) et la plateforme, afin de
              permettre la mise en correspondance manuelle du paiement.
            </p>
            <p className="mt-2">
              La modèle ne peut être tenue responsable d&apos;un pseudonyme mal
              renseigné, incomplet, divergent ou incohérent entre les deux
              services. En particulier, aucun remboursement ne sera dû si le
              client utilise un pseudonyme différent de celui enregistré sur la
              plateforme.
            </p>
            <p className="mt-3">
              <strong>Procédure de correction&nbsp;:</strong> si le client
              constate a posteriori qu&apos;il a utilisé un mauvais pseudonyme, il
              doit&nbsp;:
            </p>
            <ol className="list-decimal pl-6 space-y-1.5 mt-2">
              <li>
                Recréer un compte sur la plateforme avec le bon pseudonyme
              </li>
              <li>
                Envoyer, via la messagerie interne, un message explicite
                contenant la référence du paiement (au format{" "}
                <code>YUMI-P...</code>), l&apos;ancien pseudonyme utilisé et le
                nouveau pseudonyme correct
              </li>
              <li>
                L&apos;agent IA reconnaît automatiquement cette demande et la
                soumet à la modèle pour arbitrage
              </li>
              <li>
                Si la correspondance (montant, date, référence) est vérifiée, la
                modèle transfère le code d&apos;accès au nouveau compte
              </li>
            </ol>
            <p className="mt-3 opacity-80">
              Aucune garantie de succès n&apos;est donnée&nbsp;: la procédure
              dépend de la capacité à rapprocher le paiement reçu du compte
              corrigé. Tout abus de cette procédure (tentative d&apos;obtenir un
              second accès pour un paiement unique) entraîne révocation
              immédiate.
            </p>
          </div>

          {/* 8 — Droit de rétractation */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Droit de rétractation
            </h2>
            <p>
              Conformément à l&apos;<strong>article&nbsp;VI.53, 13°</strong> du
              Code de droit économique belge (transposition de la directive
              2011/83/UE relative aux droits des consommateurs), le droit de
              rétractation de 14&nbsp;jours ne s&apos;applique pas à la{" "}
              <strong>fourniture de contenu numérique non fourni sur un
              support matériel</strong> dont l&apos;exécution a commencé avec
              l&apos;accord préalable exprès du consommateur, et qui a reconnu
              perdre son droit de rétractation.
            </p>
            <p className="mt-2">
              En cochant la case d&apos;acceptation des CGV et en procédant au
              paiement, le client&nbsp;:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                Demande <strong>l&apos;exécution immédiate</strong> du contrat de
                fourniture de contenu numérique
              </li>
              <li>
                Reconnaît expressément <strong>renoncer à son droit de
                rétractation</strong> dès la génération du code d&apos;accès
              </li>
            </ul>
            <p className="mt-3 opacity-80">
              Cette renonciation s&apos;applique également aux contenus
              personnalisés (pack Custom), lesquels sont par nature{" "}
              <strong>confectionnés selon les spécifications du
              consommateur</strong> (art.&nbsp;VI.53, 3° du Code de droit
              économique).
            </p>
          </div>

          {/* 9 — Contenu des packs */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Contenu des packs
            </h2>
            <p>
              Chaque pack donne accès à un contenu distinct, cloisonné au niveau
              du serveur. Un code généré pour un pack donné ne permet{" "}
              <strong>en aucun cas</strong> d&apos;accéder au contenu d&apos;un
              autre pack.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                <strong>Silver</strong> — photos glamour sexy, sans nudité
              </li>
              <li>
                <strong>Gold</strong> — photos en poses suggestives
              </li>
              <li>
                <strong>VIP Black</strong> — nu sans visage
              </li>
              <li>
                <strong>VIP Platinum</strong> — nu avec visage
              </li>
              <li>
                <strong>Custom</strong> — contenu composé à la demande du client
                (sélection de photos, vidéos et catégories selon la grille custom
                affichée au panier, avec description libre)
              </li>
            </ul>
            <p className="mt-3 opacity-80">
              La modèle se réserve le droit d&apos;adapter le contenu livré en
              fonction de ses limites personnelles et légales. Toute demande
              contraire à la dignité, à la loi ou aux bonnes mœurs est
              automatiquement refusée&nbsp;; le paiement correspondant est alors
              remboursé.
            </p>
          </div>

          {/* 10 — Usage personnel uniquement */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Usage personnel uniquement
            </h2>
            <p>
              Le contenu acheté est délivré au client sous{" "}
              <strong>licence personnelle, non transférable et non
              commerciale</strong>, pour son usage privé exclusif.
            </p>
            <p className="mt-2">
              Sont strictement interdits, sans limitation&nbsp;:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                La <strong>revente</strong>, la cession ou le partage du code
                d&apos;accès
              </li>
              <li>
                La <strong>redistribution</strong>, la publication en ligne ou la
                diffusion publique du contenu
              </li>
              <li>
                La <strong>capture d&apos;écran</strong>, l&apos;enregistrement
                d&apos;écran ou toute reproduction par quelque moyen que ce soit
              </li>
              <li>
                L&apos;usage du contenu sur d&apos;autres plateformes,
                l&apos;upload sur des sites tiers, ou toute forme d&apos;archivage
                non autorisé
              </li>
              <li>
                Toute utilisation à des fins commerciales, publicitaires ou
                promotionnelles
              </li>
            </ul>
            <p className="mt-3">
              Toute violation entraîne <strong>révocation immédiate du code
              d&apos;accès sans remboursement</strong>, signalement légal au
              titre de la contrefaçon (art.&nbsp;XI.165 et suivants du Code de
              droit économique belge) et, le cas échéant, poursuites civiles
              et/ou pénales.
            </p>
          </div>

          {/* 11 — Révocation du code */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              11. Révocation du code
            </h2>
            <p>
              La modèle se réserve le droit de révoquer un code d&apos;accès, à
              tout moment et sans remboursement, dans les cas suivants&nbsp;:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                Fraude avérée ou tentative de fraude
              </li>
              <li>
                Partage, revente ou diffusion du contenu
              </li>
              <li>
                Violation de l&apos;une des clauses des présentes CGV
              </li>
              <li>
                Litige PayPal (dispute / chargeback) non justifié ou abusif
              </li>
              <li>
                Comportement abusif envers la modèle ou la plateforme (harcèlement,
                menaces, contenu non sollicité)
              </li>
            </ul>
            <p className="mt-3 opacity-80">
              La révocation est consignée dans un registre d&apos;audit
              immuable, conformément aux obligations de traçabilité de la
              plateforme.
            </p>
          </div>

          {/* 12 — Données personnelles */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              12. Données personnelles
            </h2>
            <p>
              Le traitement des données personnelles dans le cadre de la
              commande est régi par notre{" "}
              <a
                href="/privacy"
                className="underline focus-visible:outline-none focus-visible:ring-2 rounded"
                style={{ color: "#E84393" }}
              >
                Politique de confidentialité
              </a>
              , conforme au Règlement général sur la protection des données
              (RGPD — Règlement UE 2016/679).
            </p>
            <p className="mt-2 opacity-80">
              Les données de paiement sont traitées directement par les
              prestataires PSP (PayPal, Revolut, Stripe) et ne transitent pas par
              la plateforme.
            </p>
          </div>

          {/* 13 — Juridiction */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              13. Droit applicable et juridiction
            </h2>
            <p>
              Les présentes CGV sont soumises au <strong>droit belge</strong>.
            </p>
            <p className="mt-2">
              En cas de litige, et à défaut de résolution amiable préalable, les{" "}
              <strong>tribunaux de Bruxelles (arrondissement francophone)</strong>{" "}
              seront seuls compétents, sans préjudice des dispositions d&apos;ordre
              public du pays de résidence du consommateur au sein de
              l&apos;Union européenne (art.&nbsp;17 à 19 du Règlement Bruxelles I
              bis).
            </p>
          </div>

          {/* 14 — Contact */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-3">
              14. Contact
            </h2>
            <p>
              Toute question, réclamation ou demande relative à une commande doit
              être adressée <strong>via la messagerie interne</strong> de la
              plateforme, directement à la modèle concernée.
            </p>
            <p className="mt-2 opacity-80">
              Un délai de réponse raisonnable s&apos;applique selon la charge et
              la disponibilité de la modèle. L&apos;agent IA peut intervenir en
              première ligne pour qualifier la demande et la router vers la
              modèle si nécessaire.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
