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
# Générer le client Prisma
pnpm prisma:generate

# Créer les tables
pnpm prisma:push

# Ou avec migrations
pnpm prisma migrate dev --name init

# Ouvrir Prisma Studio (interface DB)
pnpm prisma:studio
```

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
pnpm prisma:generate  # Générer client Prisma
pnpm prisma:push      # Push schema DB
pnpm prisma:studio    # Interface DB
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
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Optionnelles :
- `RESEND_API_KEY` (emails)
- `UPLOADTHING_*` (upload fichiers)
- `STRIPE_*` (paiements)

## 🚢 Déploiement

### Vercel (recommandé)
1. Push sur GitHub
2. Connecter à Vercel
3. Configurer les variables d'environnement
4. Déployer

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
