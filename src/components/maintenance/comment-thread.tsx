"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/maintenance";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Échanges ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun commentaire pour le moment.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => {
              const name = comment.authorName || comment.author?.name || "Utilisateur";
              const isMine = comment.authorId === currentUserId;
              return (
                <li key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">
                        {name}
                        {isMine && " (vous)"}
                      </span>
                      <Badge variant="outline">{roleLabels[comment.authorRole]}</Badge>
                      <span className="text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            className="min-h-[90px]"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSending || !content.trim()}>
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
