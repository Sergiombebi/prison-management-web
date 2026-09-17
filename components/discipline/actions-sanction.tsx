"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Sanction } from "@/lib/domain/types";
import { annulerSanction, terminerSanction } from "@/app/(app)/discipline/actions";
import { Button } from "@/components/ui/button";
import { BoutonConfirmation } from "@/components/ui/bouton-confirmation";
import { Icon } from "@/components/ui/icon";

/**
 * Terminer une sanction, ou annuler une saisie erronée.
 *
 * Terminer libère la cellule disciplinaire sans remettre le détenu ailleurs :
 * c'est voulu côté API (la cellule d'origine peut être devenue pleine). Le
 * message du serveur est donc affiché tel quel, avec un lien de réaffectation.
 */
export function ActionsSanction({ sanction }: { sanction: Sanction }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [retour, setRetour] = useState<{ ok: boolean; message: string }>();

  if (sanction.estActif === false) {
    return <span className="text-2xs text-faint">Annulée</span>;
  }

  const terminable = sanction.statut !== "Terminée";
  const lienReaffectation = `/discipline/affectations?detenu=${sanction.detenuId}${
    sanction.celluleOrigine ? `&cellule=${sanction.celluleOrigine.id}` : ""
  }`;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {terminable && (
          <Button
            type="button"
            taille="sm"
            icone="check"
            chargement={enCours}
            onClick={() =>
              demarrer(async () => {
                const r = await terminerSanction(sanction.id);
                // Le message de l'API s'adresse aux développeurs (« via POST /detenus/… ») :
                // on garde le nôtre en cas de succès, le sien en cas d'échec.
                setRetour({
                  ok: r.ok,
                  message: r.ok
                    ? sanction.isolementEnCours
                      ? "Sanction terminée. Le détenu n’a plus de cellule."
                      : "Sanction terminée."
                    : r.message,
                });
                router.refresh();
              })
            }
          >
            Terminer
          </Button>
        )}
        <BoutonConfirmation
          libelle="Annuler"
          taille="sm"
          icone="trash"
          titre="Annuler cette sanction ?"
          description={
            <>
              <p>
                La sanction disparaîtra des sanctions en cours, mais restera dans l’historique du
                détenu comme annulée.
              </p>
              <p className="mt-2">
                À réserver à une saisie erronée. Pour mettre fin à une sanction réellement purgée,
                utilisez « Terminer » : cela libère aussi la cellule disciplinaire.
              </p>
            </>
          }
          confirmer="Annuler la sanction"
          action={() => annulerSanction(sanction.id)}
        />
      </div>

      {retour && (
        <p
          role="status"
          className={`max-w-[42ch] text-right text-2xs ${retour.ok ? "text-muted" : "text-danger"}`}
        >
          {retour.message}
          {retour.ok && sanction.isolementEnCours && (
            <>
              {" "}
              <Link
                href={lienReaffectation}
                className="inline-flex items-center gap-1 font-medium text-accent-ink underline underline-offset-2"
              >
                <Icon name="arrowRight" size={11} />
                Réaffecter une cellule
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
