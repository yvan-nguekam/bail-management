import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function tenantInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface TenantAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "lg";
  className?: string;
}

/** Avatar du locataire : photo si disponible, sinon initiales sur fond teinté. */
export function TenantAvatar({ name, src, size = "sm", className }: TenantAvatarProps) {
  return (
    <Avatar className={cn(size === "lg" ? "size-14 text-lg" : "size-9 text-xs", className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-primary/10 font-medium text-primary">
        {tenantInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
