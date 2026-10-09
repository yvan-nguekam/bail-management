"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MailCheck, UserCheck } from "lucide-react";

export interface FoundTenant {
  id: string;
  name: string;
}

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Locataire existant retrouvé par e-mail exact : à sélectionner dans le bail */
  onSelect: (tenant: FoundTenant) => void;
  /** Invitation envoyée (le locataire apparaîtra une fois son compte créé) */
  onInvited: () => void;
}

type Step =
  | { kind: "search" }
  | { kind: "found"; tenant: FoundTenant }
  | { kind: "invite" }
  | { kind: "invited"; email: string; emailSent: boolean };

const alertClass =
  "rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive";

/**
 * Recherche d'un locataire par e-mail EXACT, puis invitation s'il n'a pas de compte.
 * Aucune liste de comptes n'est exposée : on ne retrouve que l'adresse saisie.
 */
export function AddTenantDialog({ open, onOpenChange, onSelect, onInvited }: AddTenantDialogProps) {
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep({ kind: "search" });
    setEmail("");
    setName("");
    setPhone("");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // Ce formulaire est rendu dans un portail mais reste un enfant React du formulaire
  // de bail : on bloque la propagation pour ne pas soumettre le bail.
  const stop = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const search = async (e: React.FormEvent) => {
    stop(e);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenants/lookup?email=${encodeURIComponent(email)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Recherche impossible. Réessayez.");
        return;
      }
      setStep(data.tenant ? { kind: "found", tenant: data.tenant } : { kind: "invite" });
    } catch {
      setError("Recherche impossible. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  const invite = async (e: React.FormEvent) => {
    stop(e);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenants/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Invitation impossible. Réessayez.");
        return;
      }
      if (data.status === "existing" && data.tenant) {
        setStep({ kind: "found", tenant: data.tenant });
        return;
      }
      setStep({ kind: "invited", email: data.invitation.email, emailSent: Boolean(data.emailSent) });
      onInvited();
    } catch {
      setError("Invitation impossible. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un locataire</DialogTitle>
          <DialogDescription>
            Saisissez l&apos;adresse e-mail complète du locataire. S&apos;il n&apos;a pas encore de
            compte, vous pourrez l&apos;inviter.
          </DialogDescription>
        </DialogHeader>

        {step.kind === "search" && (
          <form onSubmit={search} className="space-y-4" aria-busy={isLoading}>
            <div className="space-y-2">
              <Label htmlFor="tenant-lookup-email">Adresse e-mail du locataire</Label>
              <Input
                id="tenant-lookup-email"
                type="email"
                autoComplete="off"
                placeholder="locataire@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            {error && <p role="alert" className={alertClass}>{error}</p>}
            <DialogFooter>
              <Button type="submit" className="h-11 w-full sm:w-auto" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Trouver par e-mail
              </Button>
            </DialogFooter>
          </form>
        )}

        {step.kind === "found" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
              <UserCheck className="h-5 w-5 shrink-0 text-success" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{step.tenant.name}</p>
                <p className="truncate text-muted-foreground">Compte locataire trouvé pour {email.trim()}</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={reset}>
                Autre adresse
              </Button>
              <Button
                type="button"
                className="h-11"
                onClick={() => {
                  onSelect(step.tenant);
                  handleOpenChange(false);
                }}
              >
                Choisir ce locataire
              </Button>
            </DialogFooter>
          </div>
        )}

        {step.kind === "invite" && (
          <form onSubmit={invite} className="space-y-4" aria-busy={isLoading}>
            <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Aucun compte locataire pour <span className="font-medium text-foreground">{email.trim()}</span>.
              Envoyez-lui une invitation : il choisira son mot de passe, puis apparaîtra dans votre liste.
            </p>
            <div className="space-y-2">
              <Label htmlFor="tenant-invite-name">Nom complet</Label>
              <Input
                id="tenant-invite-name"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-invite-phone">
                Téléphone <span className="font-normal text-muted-foreground">(facultatif)</span>
              </Label>
              <Input
                id="tenant-invite-phone"
                type="tel"
                autoComplete="off"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                disabled={isLoading}
                className="h-11"
              />
            </div>
            {error && <p role="alert" className={alertClass}>{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={reset} disabled={isLoading}>
                Autre adresse
              </Button>
              <Button type="submit" className="h-11" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Envoyer l&apos;invitation
              </Button>
            </DialogFooter>
          </form>
        )}

        {step.kind === "invited" && (
          <div className="space-y-4" role="status">
            <div className="flex gap-3 rounded-xl border border-success/25 bg-success/10 p-4 text-sm">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div className="space-y-1">
                <p className="font-medium">Invitation envoyée</p>
                <p className="text-muted-foreground">
                  Le locataire apparaîtra dans la liste une fois son compte créé (lien valable 7 jours).
                </p>
                {!step.emailSent && (
                  <p className="text-muted-foreground">
                    L&apos;e-mail n&apos;a pas pu partir (service d&apos;envoi non configuré).
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" className="h-11" onClick={() => handleOpenChange(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
