# Rental Management Application

Application complète de gestion de baux immobiliers avec Next.js 15, TypeScript, Prisma, PostgreSQL, et Shadcn/ui.

## 🎯 Fonctionnalités

### ✅ Gestion Immobilière (CRUD Complet)
- **Propriétés**: Création, modification, suppression, recherche, filtres
- **Baux**: CRUD + Renouvellement + Résiliation avec alertes
- **Paiements**: Suivi, marquage payé, génération de reçus PDF, alertes retard

### ✅ Communication & Support
- **Maintenance**: Système de tickets avec commentaires, priorités, assignation
- **Messages**: Messagerie entre utilisateurs
- **Notifications**: Centre avec compteur en temps réel, marquage lu

### ✅ Documents & Fichiers
- Gestion de documents par propriété/bail
- Upload de fichiers (Uploadthing ready)
- Génération PDF des reçus

### ✅ Sécurité & Rôles
- **4 rôles**: ADMIN, LANDLORD, MANAGER, TENANT
- Authentification JWT avec NextAuth.js
- RBAC complet
- Protection routes avec middleware
- Journal d'activité

### ✅ Analytics & Reporting
- **Rapports financiers**: Revenus mensuels avec graphiques (12 mois)
- **Taux d'occupation**: Suivi de l'occupation des propriétés
- **Distribution paiements**: Visualisation par statut (Pie chart)
- **Export CSV**: Export des données (paiements, baux, propriétés, rapports)
- **Graphiques interactifs**: Area charts, Line charts, Pie charts (Recharts)

### ✅ Internationalisation
- **2 langues**: Français 🇫🇷 (défaut) + Anglais 🇺🇸
- **Sélecteur de langue**: Dans le header du dashboard
- **Traductions complètes**: Navigation, formulaires, messages
- **URLs multilingues**: Support /en/... et /fr/...

### ✅ Fonctionnalités Avancées
- Emails automatiques (Resend + React Email)
- Intégration Stripe (ready)
- Tests E2E (Playwright)
- Tests unitaires (Jest)

## 📦 Technologies

- **Framework**: Next.js 15 (App Router)
- **Langage**: TypeScript
- **Base de données**: PostgreSQL + Prisma ORM
- **Authentification**: NextAuth.js v4
- **UI**: Shadcn/ui + Radix UI + Tailwind CSS v4
- **Formulaires**: React Hook Form + Zod
- **Emails**: Resend + React Email
- **Upload**: Uploadthing
- **PDF**: jsPDF
- **Paiements**: Stripe
- **Charts**: Recharts
- **i18n**: next-intl
- **Tests**: Jest + Playwright

## 🚀 Installation

### 1. Cloner et installer
```bash
git clone <repo-url>
cd rental-management-app
pnpm install
```

### 2. Configuration
Copier `.env.example` vers `.env` et configurer :
```bash
cp .env.example .env
```

Éditer `.env` avec vos valeurs :
- Database URL (PostgreSQL)
- NextAuth secret
- Resend API key (optionnel)
- Uploadthing keys (optionnel)
- Stripe keys (optionnel)

### 3. Base de données
```bash
# Appliquer les migrations (crée les tables) puis charger les données de test
pnpm db:migrate
pnpm db:seed

# Ouvrir Prisma Studio (interface DB)
pnpm db:studio
```

Installation de PostgreSQL, Supabase, workflow des migrations : voir la section
« Base de données » plus bas.

### 4. Lancer l'application
```bash
pnpm dev
```

Application disponible sur http://localhost:3000

## 📊 Statistiques

- **Routes API**: 33 (+ 1 route export)
- **Pages Frontend**: 12+ (+ page /reports)
- **Modèles DB**: 10
- **Composants UI**: 20+ (graphiques, export, i18n)
- **Langues**: 2 (FR, EN)
- **Fonctionnalités**: 100% complètes ✅

## 🧪 Tests

```bash
# Tests unitaires
pnpm test

# Tests E2E
pnpm test:e2e

# Tests E2E avec UI
pnpm test:e2e:ui
```

## 📝 Scripts disponibles

```bash
pnpm dev              # Développement
pnpm build            # Build production
pnpm start            # Lancer en production
pnpm lint             # Linter
pnpm test             # Tests unitaires
pnpm test:e2e         # Tests E2E
pnpm db:migrate       # Créer/appliquer une migration en local (schéma modifié)
pnpm db:deploy        # Appliquer les migrations en attente (CI, Vercel, Supabase)
pnpm db:seed          # Charger les données de test (efface les données existantes)
pnpm db:reset         # Recréer la base de zéro + seed (dev uniquement)
pnpm db:check         # Vérifier l'état des migrations
pnpm db:studio        # Interface DB (Prisma Studio)
pnpm prisma:generate  # Générer client Prisma (déjà fait au postinstall)
pnpm prisma:push      # Pousser le schéma sans migration : prototypage rapide uniquement
pnpm prisma:studio    # Alias de db:studio
```

## 🎨 Structure

```
rental-management-app/
├── messages/           # Fichiers de traduction (i18n)
│   ├── fr.json         # Traductions françaises
│   └── en.json         # Traductions anglaises
├── prisma/             # Schéma base de données
├── src/
│   ├── app/            # Pages et routes API
│   │   ├── [locale]/   # Support multilingue
│   │   ├── (auth)/     # Pages authentification
│   │   ├── (dashboard)/ # Pages dashboard
│   │   │   ├── reports/ # Page analytics & rapports
│   │   │   ├── properties/
│   │   │   ├── leases/
│   │   │   └── payments/
│   │   └── api/        # Routes API (33 routes)
│   ├── components/     # Composants React
│   │   ├── ui/         # Composants Shadcn/ui
│   │   └── dashboard/  # Composants dashboard
│   │       ├── revenue-chart.tsx
│   │       ├── occupancy-chart.tsx
│   │       ├── payment-status-chart.tsx
│   │       ├── export-button.tsx
│   │       └── language-switcher.tsx
│   ├── lib/            # Utilitaires
│   │   ├── prisma.ts   # Client DB
│   │   ├── auth.ts     # Config auth
│   │   ├── email.ts    # Service email
│   │   ├── pdf.ts      # Génération PDF
│   │   └── export.ts   # Export CSV/Excel
│   ├── emails/         # Templates email
│   ├── types/          # Types TypeScript
│   ├── i18n.ts         # Configuration i18n
│   └── middleware.ts   # Auth + i18n middleware
├── tests/              # Tests E2E
├── .env.example        # Variables d'environnement
├── INTERNATIONALIZATION.md  # Guide i18n
└── README.md           # Documentation principale
```

## 🔐 Variables d'Environnement

Voir `.env.example` pour la liste complète des variables.

Obligatoires :
- `DATABASE_URL` (connexion de l'application ; sur Supabase, URL « pooled » port 6543)
- `DIRECT_URL` (connexion directe pour les migrations ; identique à `DATABASE_URL` en local)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Optionnelles :
- `CRON_SECRET` (tâches planifiées, voir ci-dessous)
- `RESEND_API_KEY` (emails)
- `UPLOADTHING_*` (upload fichiers)
- `STRIPE_*` (paiements)

## 🗄️ Base de données

Le projet utilise PostgreSQL via Prisma. Le schéma (`prisma/schema.prisma`) est versionné sous
forme de **migrations SQL** dans `prisma/migrations/` : chaque modification du schéma produit un
dossier de migration qui est commité, puis rejoué à l'identique sur chaque environnement
(poste de dev, staging, production). Aucune connaissance avancée de PostgreSQL n'est nécessaire :
les commandes `pnpm db:*` ci-dessous font tout le travail.

> MySQL/XAMPP n'est **pas** supporté : le schéma utilise des fonctionnalités propres à PostgreSQL
> (tableaux `String[]`, enums natifs).

### Installation locale sur macOS (recommandé : Postgres.app)

[Postgres.app](https://postgresapp.com) installe PostgreSQL sans Homebrew ni ligne de commande.

1. Télécharger Postgres.app, le glisser dans `Applications`, le lancer et cliquer sur **Initialize**.
   Le serveur tourne sur `localhost:5432` sans mot de passe pour les connexions locales.
2. Dans la fenêtre de Postgres.app, double-cliquer sur la base `postgres` : un terminal `psql`
   s'ouvre. Y coller (si le rôle `postgres` existe déjà, ignorer l'erreur de la première ligne) :
   ```sql
   CREATE ROLE postgres SUPERUSER LOGIN PASSWORD 'postgres';
   CREATE DATABASE bail_management OWNER postgres;
   ```
3. Copier `.env.example` vers `.env` ; les valeurs par défaut de `DATABASE_URL` et `DIRECT_URL`
   (`postgresql://postgres:postgres@localhost:5432/bail_management`) correspondent à cette
   configuration. En local, les deux variables sont identiques.
4. Créer les tables puis charger les données de test, et lancer l'application :
   ```bash
   pnpm db:migrate
   pnpm db:seed
   pnpm dev
   ```

### Alternative : un projet Supabase gratuit comme base de dev

Sans PostgreSQL local, un projet [Supabase](https://supabase.com) gratuit fait l'affaire : créer
un projet, récupérer les deux URLs (voir *Supabase* ci-dessous), les mettre dans `.env`, puis
exécuter les mêmes commandes (`pnpm db:migrate`, `pnpm db:seed`). Attention : utiliser un projet
**dédié au développement**, jamais celui de production (le seed efface toutes les données).

### Workflow des migrations

| Situation | Commande | Effet |
|-----------|----------|-------|
| Je modifie `prisma/schema.prisma` en local | `pnpm db:migrate` | Demande un nom, crée `prisma/migrations/<horodatage>_<nom>/migration.sql`, l'applique à la base locale et régénère le client. **Commiter le dossier de migration avec le schéma.** |
| Je récupère des migrations faites par quelqu'un d'autre (`git pull`) | `pnpm db:migrate` | Applique les migrations manquantes à la base locale. |
| CI, Vercel, Supabase staging/prod | `pnpm db:deploy` | Applique les migrations en attente, sans interaction et sans jamais supprimer de données. |
| Vérifier l'état | `pnpm db:check` | Liste les migrations appliquées / en attente. |
| Repartir de zéro en local | `pnpm db:reset` | Supprime et recrée la base, rejoue toutes les migrations puis lance le seed. **Dev uniquement.** |

Le nom peut être passé directement : `pnpm db:migrate --name add_property_floor`.

**`pnpm prisma:push`** (`prisma db push`) est réservé au prototypage rapide : il synchronise la base
avec le schéma sans créer de migration et **peut supprimer des colonnes et leurs données**. Ne
jamais l'utiliser sur une base Supabase de staging ou de production.

**Base existante créée avec `prisma:push` ?** `pnpm db:deploy` refuse alors de démarrer
(erreur `P3005 : The database schema is not empty`) car les tables existent déjà sans historique
de migration. Comme la migration initiale correspond exactement à ce schéma, il suffit de la
marquer comme déjà appliquée (« baseline »), une seule fois, sans perte de données :

```bash
npx prisma migrate resolve --applied 20261007000000_init
pnpm db:check   # doit afficher "Database schema is up to date!"
```

### Données de test (seed)

```bash
pnpm db:seed
```

Le script `prisma/seed.ts` (exécuté avec Node 24, sans outil supplémentaire) **efface toutes les
tables** puis crée un jeu de données réaliste : 5 utilisateurs, 3 biens à Douala et Yaoundé,
3 baux (2 actifs, 1 expiré), les échéances de loyer correspondantes (payées, en retard, à venir),
une caution avec retenue, des demandes de maintenance, notifications et messages. Les dates sont
calculées par rapport à la date du jour. Il refuse de s'exécuter si `NODE_ENV=production`.

Comptes créés (mot de passe `password123`) :

| Rôle | Email |
|------|-------|
| Administrateur | `admin@test.com` |
| Propriétaire | `landlord@test.com` |
| Gestionnaire | `manager@test.com` |
| Locataire | `tenant@test.com` |
| Locataire | `tenant2@test.com` |

### Supabase (staging / production)

Supabase expose deux types de connexion, d'où les deux variables :

- **`DATABASE_URL`** : l'URL « Transaction pooler » (port **6543**) suivie de `?pgbouncer=true`.
  Elle passe par PgBouncer et convient aux fonctions serverless (Vercel) qui ouvrent beaucoup de
  connexions courtes. C'est celle qu'utilise l'application.
- **`DIRECT_URL`** : l'URL directe ou « Session pooler » (port **5432**), sans `pgbouncer`.
  Prisma l'utilise pour les migrations (`db:migrate`, `db:deploy`) et Prisma Studio, qui ont
  besoin d'une connexion directe.

Où les trouver : dans le dashboard Supabase, bouton **Connect** (en haut), onglet **ORMs**,
choisir **Prisma** : les deux variables sont affichées prêtes à copier (remplacer
`[YOUR-PASSWORD]` par le mot de passe de la base, défini à la création du projet).

Appliquer les migrations sur Supabase se fait avec `pnpm db:deploy`, soit automatiquement par
Vercel au build (voir ci-dessous), soit manuellement depuis un poste :

```bash
DATABASE_URL="<url pooled>" DIRECT_URL="<url directe>" pnpm db:deploy
```

Ne jamais exécuter `pnpm prisma:push`, `pnpm db:reset` ni `pnpm db:seed` contre la base de
production.

### Vercel

1. Créer deux projets Supabase (staging et production) pour que les déploiements *Preview* ne
   touchent jamais à la base de production.
2. Dans Vercel, *Settings > Environment Variables*, renseigner `DATABASE_URL` et `DIRECT_URL`
   (ainsi que `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`),
   en scindant les valeurs par environnement : *Production* vers le projet Supabase de prod,
   *Preview* vers celui de staging.
3. Dans *Settings > Build & Development Settings*, remplacer la **Build Command** par :
   ```
   pnpm db:deploy && pnpm build
   ```
   Les migrations en attente sont ainsi appliquées avant chaque build ; si une migration échoue,
   le déploiement est annulé et l'ancienne version reste en ligne. Le client Prisma est généré
   automatiquement à l'installation (`postinstall`).

## ⏰ Tâches planifiées

La route `/api/cron/lease-status` met à jour les statuts selon le calendrier :
- baux `DRAFT` dont la date de début est atteinte → `ACTIVE` (bien `OCCUPIED`)
- baux `ACTIVE` dont la date de fin est dépassée → `EXPIRED` (bien `AVAILABLE`)
- échéances `PENDING` dont la date est dépassée → `OVERDUE` (locataire notifié)
- préavis de fin de bail à 60 puis 30 jours (locataire, propriétaire, gestionnaire)

Elle doit être appelée **une fois par jour** avec l'en-tête `Authorization: Bearer <CRON_SECRET>`
(GET ou POST), par exemple via Vercel Cron, Supabase Cron ou cron-job.org. Un administrateur
connecté peut aussi la déclencher. Les traitements peuvent être relancés sans créer de doublons.

En local, avec l'application lancée (`pnpm dev`) et `CRON_SECRET` dans `.env` :
```bash
pnpm cron:lease-status
```

## 🚢 Déploiement

### Vercel (recommandé)
1. Push sur GitHub
2. Connecter à Vercel
3. Configurer les variables d'environnement (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`,
   `NEXTAUTH_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`)
4. Dans *Settings > Build & Development Settings*, définir la **Build Command** :
   `pnpm db:deploy && pnpm build` (applique les migrations Supabase avant chaque build)
5. Déployer

Détails (Supabase, migrations, environnements Preview) dans la section
« Base de données ».

### Autres options
- Railway (PostgreSQL inclus)
- Render
- AWS
- DigitalOcean

## 📚 Documentation

### Documentation Projet
- **[INTERNATIONALIZATION.md](./INTERNATIONALIZATION.md)** - Guide complet i18n
- **[GUIDE.md](./GUIDE.md)** - Guide d'utilisation de l'application
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Prochaines étapes et améliorations

### Documentation Externe
- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org)
- [Shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org/en-US)
- [next-intl](https://next-intl-docs.vercel.app)
- [Uploadthing](https://uploadthing.com)
- [Resend](https://resend.com)

## 📄 Licence

MIT

---

**Développé avec ❤️ par Claude Code**
