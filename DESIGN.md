# Design system — RentalManager

Règles d'interface du projet. Toute page ou composant doit les respecter, en mode clair **et** sombre.

## Principes

- **Sobre et lisible** : base neutre gris-ardoise, un seul accent (sarcelle, `primary`). Pas de dégradés décoratifs, pas de couleurs vives hors statuts.
- **Les couleurs ont un sens** : `success` (payé, actif), `warning` (en retard de traitement, expire bientôt), `destructive` (impayé, résilié, urgent), `info` (en cours, occupé). Jamais de `text-green-600`, `bg-red-50`, etc. : uniquement les tokens.
- **Deux thèmes toujours** : tout ce qui est stylé doit fonctionner en clair et en sombre. Les tokens s'en chargent ; ne jamais coder une couleur en dur.
- **Animations courtes** (150–300 ms), uniquement `transform` / `opacity`, désactivées par `prefers-reduced-motion` (géré globalement).
- **Pas de gadgets** : pas d'emoji en guise d'icône (icônes Lucide), pas d'animation infinie hors chargement, pas de `scale` au survol qui déplace la mise en page.

## Tokens (globals.css)

| Usage | Classe Tailwind |
|---|---|
| Fond de page / texte | `bg-background` `text-foreground` |
| Carte, popover | `bg-card` `bg-popover` |
| Texte secondaire | `text-muted-foreground` (contraste ≥ 4.5:1) |
| Accent | `bg-primary text-primary-foreground`, `text-primary` |
| Fond de survol | `bg-accent` |
| États | `success` `warning` `info` `destructive` (+ `-foreground`) — teintes douces : `bg-success/10 text-success border-success/25` |
| Bordures / champs | `border-border` `border-input` |
| Graphiques | `--chart-1` … `--chart-5` (sarcelle, bleu, ambre, gris, rose) |
| Ombres | `shadow-card` (repos) `shadow-card-hover` (survol) |
| Rayons | `rounded-lg` (contrôles) `rounded-xl` (cartes) |

Typographie : Inter partout. Titres `font-semibold tracking-tight` ; chiffres `tabular-nums`.

## Composants partagés

| Composant | Fichier | Rôle |
|---|---|---|
| `PageHeader` | `src/components/shared/page-header.tsx` | Titre, description, bouton retour (`backHref` ou `onBack`), actions à droite |
| `StatusBadge` / `statusLabel` | `src/components/shared/status-badge.tsx` | Libellé + couleur de **tous** les statuts (bail, paiement, bien, maintenance, priorité, caution) |
| `StatCard` | `src/components/dashboard/stat-card.tsx` | Indicateur avec icône teintée (`tone`), valeur teintable (`valueClassName`), tendance, animation décalée (`index`) |
| `EmptyState` | `src/components/shared/empty-state.tsx` | État vide avec icône, texte et action (`size="sm"` dans une carte) |
| `PageSkeleton` / `TableSkeleton` | `src/components/shared/page-skeleton.tsx` | Chargement (préférer aux spinners plein écran) |
| `Badge` | variantes `success` `warning` `info` `danger` `muted` | Ne pas recréer des pastilles à la main |
| `ThemeToggle` | `src/components/dashboard/theme-toggle.tsx` | Clair / sombre / système |

## Structure d'une page

```tsx
<div className="space-y-6">
  <PageHeader title="Baux" description="…" actions={<Button>Nouveau bail</Button>} />
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{/* StatCard index={i} */}</div>
  <Card>…</Card>
</div>
```

- Le layout du dashboard fournit déjà le conteneur (`max-w-7xl`, padding responsive) : pas de `container` ni de padding de page supplémentaire.
- Titre de carte + bouton à droite : `CardHeader` avec `<CardAction>` (slot shadcn) plutôt que des classes flex ad hoc.
- Listes : `Card` + `Table` ; lignes cliquables avec `cursor-pointer hover:bg-muted/50 transition-colors`.
- Chargement : skeleton à la place du contenu, jamais une page blanche. Vide : `EmptyState`.
- Formulaires : `Form` (react-hook-form + zod), champs groupés dans des `Card` avec `CardTitle`, bouton principal désactivé pendant l'envoi.
- Entrée en scène : `animate-fade-up` sur les blocs de page, `style={{ "--stagger": i }}` pour décaler une grille (max ~8 éléments).
- Responsive : vérifier 375 px, 768 px, 1024 px, 1440 px ; aucun défilement horizontal ; cibles tactiles ≥ 44 px.
- Accessibilité : `aria-label` sur les boutons-icônes, `label` sur chaque champ, focus visible (géré globalement), la couleur n'est jamais le seul indicateur (toujours un libellé).

## À éviter

- Couleurs Tailwind nommées (`green-600`, `orange-50`…) dans les pages.
- `$` : les montants passent par `formatCurrency` (FCFA).
- Spinner centré sur toute la page pour un simple chargement de liste.
- Titres en anglais : l'interface est en français (l'i18n viendra via `next-intl`).
