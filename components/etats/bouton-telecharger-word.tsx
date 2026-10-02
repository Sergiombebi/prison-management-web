"use client";

import { useState } from "react";
import type { DossierDetenu } from "@/lib/api";
import type { Parametres } from "@/lib/domain/types";
import { genererDocumentWord } from "@/lib/documents/genererWord";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Génère le .docx dans le navigateur (librairie `docx`), à partir des mêmes données déjà
 * chargées pour l'aperçu - pas d'aller-retour serveur supplémentaire.
 */
export function BoutonTelechargerWord({
  etatValide,
  dossier,
  parametres,
}: {
  etatValide: string;
  dossier: DossierDetenu;
  parametres: Parametres;
}) {
  const { push } = useToast();
  const [enCours, setEnCours] = useState(false);

  return (
    <Button
      type="button"
      icone="download"
      chargement={enCours}
      onClick={async () => {
        setEnCours(true);
        try {
          const blob = await genererDocumentWord(etatValide, dossier, parametres);
          const url = URL.createObjectURL(blob);
          const lien = document.createElement("a");
          lien.href = url;
          lien.download = `${etatValide} - ${dossier.detenu.numeroEcrou}.docx`;
          lien.click();
          URL.revokeObjectURL(url);
        } catch {
          push({ type: "error", title: "Échec de la génération du document Word." });
        } finally {
          setEnCours(false);
        }
      }}
    >
      Word (.docx)
    </Button>
  );
}
