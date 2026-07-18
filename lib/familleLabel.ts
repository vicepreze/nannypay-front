// Repère d'identité "qui je suis" : remplace les labels bruts "Famille A" / "Famille B"
// par un ancrage explicite relatif à l'utilisateur connecté, partout dans l'app.
export function familleLabel(nomAffiche: string | null | undefined, estMoi: boolean): string {
  const qui = estMoi ? 'Votre famille' : "L'autre famille";
  return nomAffiche ? `${qui} (${nomAffiche})` : qui;
}
