import { redirect } from "next/navigation"

// Le profil se gère dans l'onglet "Profil" des paramètres
export default function ProfilePage() {
  redirect("/settings")
}
