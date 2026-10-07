// Libellés des types de bien, partagés par la liste, le détail et les formulaires
export const propertyTypeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  STUDIO: "Studio",
  COMMERCIAL: "Commercial",
  OFFICE: "Bureau",
  OTHER: "Autre",
};

export function propertyTypeLabel(type: string) {
  return propertyTypeLabels[type] ?? type;
}

// Statuts proposés dans les filtres et le formulaire d'édition (ordre d'affichage)
export const propertyStatuses = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "UNAVAILABLE"] as const;

// Dates stockées à minuit UTC : formater en UTC pour éviter le décalage d'un jour
export function formatDay(value: string | Date) {
  return new Date(value).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}
