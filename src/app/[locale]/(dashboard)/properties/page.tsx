"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { statusLabel } from "@/components/shared/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { PropertyCard, type PropertyCardData } from "@/components/properties/property-card";
import { ListPagination } from "@/components/properties/list-pagination";
import {
  propertyStatuses,
  propertyTypeLabels,
} from "@/components/properties/property-labels";
import { Building2, KeyRound, Plus, Search, SearchX, Users, Wrench } from "lucide-react";

interface Property extends PropertyCardData {
  owner: {
    name: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PropertyStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
}

// Compte les biens d'un statut via la pagination de l'API (requête minimale)
async function countProperties(status?: string) {
  const params = new URLSearchParams({ page: "1", limit: "1" });
  if (status) params.append("status", status);
  const response = await fetch(`/api/properties?${params}`);
  if (!response.ok) return 0;
  const data = await response.json();
  return (data.pagination?.total as number) ?? 0;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }

      const response = await fetch(`/api/properties?${params}`);

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des propriétés");
      }

      const data = await response.json();
      setProperties(data.properties);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [total, available, occupied, maintenance] = await Promise.all([
        countProperties(),
        countProperties("AVAILABLE"),
        countProperties("OCCUPIED"),
        countProperties("MAINTENANCE"),
      ]);
      setStats({ total, available, occupied, maintenance });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [pagination.page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const filteredProperties = properties.filter((property) =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasFilters = searchTerm !== "" || statusFilter !== "all" || typeFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const createAction = (
    <Button asChild>
      <Link href="/properties/new">
        <Plus aria-hidden />
        Nouveau bien
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biens"
        description="Gérez votre parc immobilier et suivez son occupation."
        actions={createAction}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total des biens"
          value={stats?.total ?? "—"}
          icon={Building2}
          index={0}
        />
        <StatCard
          title="Disponibles"
          value={stats?.available ?? "—"}
          icon={KeyRound}
          tone="success"
          index={1}
        />
        <StatCard
          title="Occupés"
          value={stats?.occupied ?? "—"}
          icon={Users}
          tone="info"
          index={2}
        />
        <StatCard
          title="En travaux"
          value={stats?.maintenance ?? "—"}
          icon={Wrench}
          tone="warning"
          index={3}
        />
      </div>

      {/* Barre d'outils : recherche + filtres */}
      <div
        className="animate-fade-up flex flex-col gap-2 sm:flex-row sm:items-center"
        style={{ "--stagger": 4 } as React.CSSProperties}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Rechercher un nom, une adresse, une ville…"
            aria-label="Rechercher un bien"
            className="h-10 bg-card pl-9 sm:h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-full bg-card sm:h-9 sm:w-[160px]" aria-label="Filtrer par type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(propertyTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full bg-card sm:h-9 sm:w-[160px]" aria-label="Filtrer par statut">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {propertyStatuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {statusLabel("property", value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="Aucun bien ne correspond"
            description="Essayez un autre terme de recherche ou réinitialisez les filtres."
            action={
              <Button variant="outline" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="Aucun bien pour le moment"
            description="Ajoutez votre premier bien pour commencer à gérer vos locations."
            action={createAction}
          />
        )
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property, i) => (
              <PropertyCard key={property.id} property={property} index={Math.min(i, 8)} />
            ))}
          </div>

          <ListPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            itemLabels={["bien", "biens"]}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          />
        </div>
      )}
    </div>
  );
}
