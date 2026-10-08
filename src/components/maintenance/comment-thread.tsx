"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { MaintenanceComment } from "./types";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Date relative pour les messages récents, absolue au-delà d'une semaine. */
function formatCommentDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < MINUTE) return "à l'instant";
  if (diff < HOUR) return `il y a ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `il y a ${hours} h`;
  }
  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY);
    return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  }
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

interface CommentThreadProps {
  requestId: string;
  initialComments: MaintenanceComment[];
  currentUserId?: string;
}

export function CommentThread({
  requestId,
  initialComments,
  currentUserId,
}: CommentThreadProps) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/maintenance/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'envoi");
      }

      setContent("");

      // Recharger le fil pour inclure les éventuels messages des autres participants
      const listResponse = await fetch(`/api/maintenance/${requestId}/comments`);
      if (listResponse.ok) {
        setComments(await listResponse.json());
      } else {
        const created: MaintenanceComment = await response.json();
        setComments((prev) => [...prev, created]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="animate-fade-up" style={{ "--stagger": 2 } as React.CSSProperties}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden />
          Échanges
          <span className="font-normal text-muted-foreground tabular-nums">
            ({comments.length})
          </span>
        </CardTitle>
        <CardDescription>
          Visibles par le demandeur, le propriétaire, le gestionnaire et l&apos;intervenant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm font-medium">Aucun commentaire</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Posez une question ou partagez une mise à jour ci-dessous.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => {
              const name = comment.authorName || comment.author?.name || "Utilisateur";
              const isMine = comment.authorId === currentUserId;
              return (
                <li
                  key={comment.id}
                  className={cn("flex gap-3", isMine && "flex-row-reverse")}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-xs font-medium",
                        isMine && "bg-primary/10 text-primary"
                      )}
                    >
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1", isMine && "items-end")}>
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs",
                        isMine && "justify-end"
                      )}
                    >
                      <span className="font-medium text-foreground">
                        {isMine ? "Vous" : name}
                      </span>
                      <Badge variant="muted" className="px-1.5 py-0 text-[11px]">
                        {roleLabels[comment.authorRole]}
                      </Badge>
                      <time
                        dateTime={comment.createdAt}
                        title={new Date(comment.createdAt).toLocaleString("fr-FR")}
                        className="text-muted-foreground"
                      >
                        {formatCommentDate(comment.createdAt)}
                      </time>
                    </div>
                    <p
                      className={cn(
                        "whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                        isMine
                          ? "rounded-tr-sm bg-primary/10 text-foreground"
                          : "rounded-tl-sm bg-muted text-foreground"
                      )}
                    >
                      {comment.content}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-5">
          <label htmlFor="new-comment" className="text-sm font-medium">
            Ajouter un commentaire
          </label>
          <Textarea
            id="new-comment"
            placeholder="Votre message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            className="min-h-[90px]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {content.length} / 5000
            </p>
            <Button type="submit" disabled={isSending || !content.trim()}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              Envoyer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
