# Rental Management Application - Guide Complet

## Vue d'ensemble

Application complète de gestion de baux immobiliers construite avec Next.js 15, TypeScript, Prisma, PostgreSQL, NextAuth.js, et Shadcn/ui.

## Architecture du Projet

```
rental-management-app/
├── prisma/
│   └── schema.prisma           # Schéma de base de données Prisma
├── src/
│   ├── app/                    # App Router Next.js
│   │   ├── api/               # Routes API
│   │   │   └── auth/          # Auth endpoints
│   │   ├── (auth)/            # Pages d'authentification
│   │   ├── (dashboard)/       # Pages du dashboard
│   │   │   ├── admin/         # Dashboard Admin
│   │   │   ├── landlord/      # Dashboard Bailleur
│   │   │   └── tenant/        # Dashboard Locataire
│   │   ├── layout.tsx         # Layout principal
│   │   └── page.tsx           # Page d'accueil
│   ├── components/
│   │   ├── ui/                # Composants Shadcn/ui
│   │   ├── providers/         # Context providers
│   │   ├── dashboard/         # Composants dashboard
│   │   └── forms/             # Formulaires réutilisables
│   ├── lib/
│   │   ├── prisma.ts          # Client Prisma
│   │   ├── auth.ts            # Configuration NextAuth
│   │   └── utils.ts           # Fonctions utilitaires
│   └── types/
│       └── next-auth.d.ts     # Types NextAuth
├── .env                        # Variables d'environnement
└── package.json
```

## Modèles de Base de Données

### User (Utilisateur)
- **Rôles**: ADMIN, LANDLORD, MANAGER, TENANT
- Gère l'authentification et les informations utilisateur
- Relations avec propriétés, baux, paiements, messages, etc.

### Property (Propriété)
- Informations détaillées sur les propriétés
- Lié au propriétaire (owner) et gestionnaire (manager)
- Contient images, équipements, et caractéristiques

### Lease (Bail)
- Gère les contrats de location
- Statuts: DRAFT, ACTIVE, EXPIRED, TERMINATED, RENEWED
- Lié à une propriété et un locataire

### Payment (Paiement)
- Suivi des paiements de loyer
- Statuts: PENDING, PAID, OVERDUE, CANCELLED
- Méthodes: CASH, BANK_TRANSFER, CREDIT_CARD, CHECK, MOBILE_MONEY

### MaintenanceRequest (Demande de maintenance)
- Système de tickets pour les réparations
- Priorités: LOW, MEDIUM, HIGH, URGENT
- Système de commentaires

### Message (Messages)
- Communication entre bailleurs et locataires
- Système de notifications intégré

### Notification
- Types: PAYMENT_REMINDER, PAYMENT_RECEIVED, LEASE_EXPIRING, etc.

### Document
- Gestion des fichiers (contrats, factures, reçus)

### Activity (Activités)
- Journal d'audit des actions utilisateur

## Installation et Configuration

### 1. Installation des dépendances

\`\`\`bash
pnpm install
\`\`\`

### 2. Configuration de la base de données

Installez PostgreSQL (sur macOS : [Postgres.app](https://postgresapp.com), voir la section
« Base de données » du README), créez une base `bail_management` et configurez le fichier `.env`:

\`\`\`env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bail_management"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/bail_management"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-clé-secrète-ici"
\`\`\`

En local, `DATABASE_URL` et `DIRECT_URL` sont identiques. Sur Supabase, la première est l'URL
« pooled » (port 6543, `?pgbouncer=true`) et la seconde l'URL directe (port 5432).

### 3. Migrations Prisma

Le schéma est versionné par migrations (`prisma/migrations/`). Le client Prisma est généré
automatiquement à l'installation (`postinstall`).

\`\`\`bash
# Appliquer les migrations à la base locale (crée les tables)
pnpm db:migrate

# Après une modification de prisma/schema.prisma : crée une nouvelle migration, à commiter
pnpm db:migrate --name nom_de_la_migration

# Sur un environnement distant (CI, Vercel, Supabase) : appliquer sans interaction
pnpm db:deploy
\`\`\`

`pnpm prisma:push` (`prisma db push`) reste disponible pour le prototypage rapide uniquement :
il ne crée pas de migration et peut supprimer des données.

### 4. Données de test (seed)

\`\`\`bash
pnpm db:seed
\`\`\`

Le script `prisma/seed.ts` efface toutes les tables puis crée des utilisateurs, biens, baux,
paiements, demandes de maintenance, notifications et messages de démonstration. Comptes créés
(mot de passe `password123`) : `admin@test.com`, `landlord@test.com`, `manager@test.com`,
`tenant@test.com`, `tenant2@test.com`.

### 5. Lancer l'application

\`\`\`bash
pnpm dev
\`\`\`

L'application sera disponible sur `http://localhost:3000`

## Fonctionnalités Principales

### Pour les Administrateurs
- Vue d'ensemble complète du système
- Gestion des utilisateurs (tous rôles)
- Statistiques globales
- Configuration du système

### Pour les Bailleurs/Gestionnaires
- Gestion des propriétés (CRUD)
- Gestion des baux
- Suivi des paiements
- Gestion des locataires
- Traitement des demandes de maintenance
- Communication avec les locataires
- Génération de rapports financiers
- Gestion des documents

### Pour les Locataires
- Consultation du bail
- Historique des paiements
- Paiement en ligne (à venir avec Stripe)
- Soumission de demandes de maintenance
- Communication avec le bailleur
- Accès aux documents
- Notifications automatiques

## Prochaines Étapes de Développement

1. **Pages d'authentification** - Login/Register avec design moderne
2. **Dashboards** - Un pour chaque rôle avec statistiques
3. **Gestion des propriétés** - CRUD complet avec upload d'images
4. **Gestion des baux** - Création, renouvellement, résiliation
5. **Système de paiement** - Suivi et intégration Stripe
6. **Maintenance** - Système de tickets complet
7. **Messagerie** - Communication en temps réel
8. **Notifications** - Email et in-app
9. **Documents** - Upload et gestion
10. **Multilingue** - i18n (français/anglais)

## Technologies Utilisées

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Base de données**: PostgreSQL avec Prisma ORM
- **Authentification**: NextAuth.js v4
- **UI Components**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS v4
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Notifications**: Sonner

## Structure des Routes

\`\`\`
/                           # Page d'accueil
/auth/login                 # Connexion
/auth/register              # Inscription

/admin/*                    # Routes admin
/landlord/*                 # Routes bailleur
/tenant/*                   # Routes locataire

/dashboard                  # Dashboard général (redirige selon le rôle)
/properties                 # Gestion des propriétés
/leases                     # Gestion des baux
/payments                   # Gestion des paiements
/maintenance                # Demandes de maintenance
/messages                   # Messagerie
/documents                  # Documents
/profile                    # Profil utilisateur
\`\`\`

## Sécurité

- Authentification JWT avec NextAuth.js
- Hachage des mots de passe avec bcrypt
- Protection CSRF
- Validation des données avec Zod
- Autorisation basée sur les rôles (RBAC)
- Journalisation des activités

## Performance

- Server Components par défaut
- Optimisation des images avec next/image
- Code splitting automatique
- Mise en cache optimisée
- Requêtes de base de données optimisées

## Tests (À implémenter)

- Unit tests avec Jest
- Integration tests avec React Testing Library
- E2E tests avec Playwright

## Déploiement

### Recommandé: Vercel

1. Push le code sur GitHub
2. Connectez votre repo à Vercel
3. Configurez les variables d'environnement (`DATABASE_URL` et `DIRECT_URL` Supabase,
   `NEXTAUTH_*`, `CRON_SECRET`, `RESEND_*`)
4. Définissez la Build Command : `pnpm db:deploy && pnpm build` (applique les migrations avant le build)
5. Déployez !

### Autres options
- Railway (PostgreSQL inclus)
- Render
- AWS
- DigitalOcean

## Support

Pour toute question ou problème, consultez la documentation ou créez une issue.

## Licence

MIT
