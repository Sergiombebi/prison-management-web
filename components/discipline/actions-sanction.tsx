"use client";

import { useRouter } from "next/navigation";
import type { Sanction } from "@/lib/domain/types";
import { annulerSanction, terminerSanction } from "@/app/(app)/discipline/actions";
import { BoutonConfirmation } from "@/components/ui/bouton-confirmation";
import { useToast } from "@/components/ui/toast";

/**
 * Terminer une sanction, ou annuler une saisie erronée. Les deux sont
 * irréversibles côté registre disciplinaire : chacune passe par une
 * confirmation.
 *
 * Terminer libère la cellule disciplinaire sans remettre le détenu ailleurs :
 * c'est voulu côté API (la cellule d'origine peut être devenue pleine). En cas
 * d'isolement en cours, le toast de confirmation porte un raccourci vers la
 * réaffectation.
 */
export function ActionsSanction({ sanction }: { sanction: Sanction }) {
  const router = useRouter();
  const { push } = useToast();

  if (sanction.estActif === false) {
    return <span className="text-2xs text-faint">Annulée</span>;
  }

  const terminable = sanction.statut !== "Terminée";
  const lienReaffectation = `/discipline/affectations?detenu=${sanction.detenuId}${
    sanction.celluleOrigine ? `&cellule=${sanction.celluleOrigine.id}` : ""
  }`;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {terminable && (
        <BoutonConfirmation
          libelle="Terminer"
          taille="sm"
          icone="check"
          variante="secondaire"
          titre="Terminer cette sanction ?"
          description={
            sanction.isolementEnCours
              ? "Le détenu sort immédiatement de la cellule disciplinaire. À réserver à une sanction réellement purgée."
              : "La sanction passera au statut « Terminée »."
          }
          confirmer="Terminer la sanction"
          // Le message de l'API s'adresse aux développeurs (« via POST /detenus/… ») : on
          // affiche le nôtre au lieu du sien.
          action={async () => {
            const r = await terminerSanction(sanction.id);
            return { ok: r.ok, message: r.ok ? undefined : r.message };
          }}
          onSuccess={() =>
            push({
              type: "success",
              title: sanction.isolementEnCours ? "Sanction terminée. Le détenu n’a plus de cellule." : "Sanction terminée.",
              actionLabel: sanction.isolementEnCours ? "Réaffecter une cellule" : undefined,
              onAction: sanction.isolementEnCours ? () => router.push(lienReaffectation) : undefined,
            })
          }
        />
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
        onSuccess={() => push({ type: "success", title: "Sanction annulée." })}
      />
    </div>
  );
}
