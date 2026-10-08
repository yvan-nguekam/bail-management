import type { LucideIcon } from "lucide-react"
import { BarChart3, Bell, Building2, FileText, MessageSquare, Shield, Users, Wrench } from "lucide-react"

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export const features: Feature[] = [
  {
    icon: Building2,
    title: "Gestion des biens",
    description: "Centralisez vos appartements, maisons et locaux avec leurs informations et photos.",
  },
  {
    icon: Users,
    title: "Suivi des locataires",
    description: "Retrouvez chaque locataire, son bail et l'historique de ses paiements.",
  },
  {
    icon: FileText,
    title: "Baux et contrats",
    description: "Créez vos baux, générez le contrat en PDF et suivez les échéances.",
  },
  {
    icon: BarChart3,
    title: "Vue financière",
    description: "Suivez les loyers encaissés, les impayés et exportez vos rapports.",
  },
  {
    icon: Wrench,
    title: "Demandes de maintenance",
    description: "Recevez, priorisez et clôturez les interventions sans perdre le fil.",
  },
  {
    icon: MessageSquare,
    title: "Messagerie intégrée",
    description: "Échangez avec vos locataires directement depuis la plateforme.",
  },
  {
    icon: Bell,
    title: "Rappels automatiques",
    description: "Soyez prévenu des loyers à venir, des baux qui expirent et des travaux.",
  },
  {
    icon: Shield,
    title: "Données protégées",
    description: "Accès par rôle, données chiffrées et sauvegardées en continu.",
  },
]

export const steps = [
  {
    title: "Ajoutez vos biens",
    description: "Renseignez vos logements en quelques minutes : adresse, loyer, caution.",
  },
  {
    title: "Créez vos baux",
    description: "Associez un locataire, fixez les dates et téléchargez le contrat prêt à signer.",
  },
  {
    title: "Suivez vos loyers",
    description: "Enregistrez les paiements, relancez les retards et exportez vos rapports.",
  },
]
