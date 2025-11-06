# Guide d'Internationalisation (i18n)

## Configuration

L'application utilise **next-intl** pour l'internationalisation avec support de 2 langues :
- 🇫🇷 **Français** (par défaut)
- 🇺🇸 **Anglais**

## Structure des fichiers

```
├── messages/
│   ├── fr.json          # Traductions françaises
│   └── en.json          # Traductions anglaises
├── src/
│   ├── i18n.ts          # Configuration next-intl
│   ├── middleware.ts    # Middleware avec gestion locale
│   └── app/
│       └── [locale]/    # Pages avec support i18n
```

## Fichiers de configuration

### 1. `src/i18n.ts`
Configuration principale de next-intl :
```typescript
export const locales = ["en", "fr"] as const
export const defaultLocale: Locale = "fr"
```

### 2. `next.config.ts`
Intégration du plugin next-intl :
```typescript
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./src/i18n.ts");
export default withNextIntl(nextConfig);
```

### 3. `src/middleware.ts`
Middleware combinant authentification et i18n :
- Gère la détection et redirection de locale
- Maintient l'authentification NextAuth
- Préserve les routes protégées

## Utilisation dans les composants

### Server Components
```typescript
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('common');
  return <h1>{t('welcome')}</h1>;
}
```

### Client Components
```typescript
'use client'
import { useTranslations } from 'next-intl';

export default function Button() {
  const t = useTranslations('common');
  return <button>{t('save')}</button>;
}
```

## Sélecteur de langue

Le composant `<LanguageSwitcher />` est intégré dans le header du dashboard :

**Localisation :** `src/components/dashboard/language-switcher.tsx`

**Fonctionnalités :**
- Menu déroulant avec drapeaux 🇫🇷 🇺🇸
- Change la langue et recharge la page
- Préserve l'URL courante
- Design responsive (masque le texte sur mobile)

## Structure des traductions

Les fichiers `messages/*.json` sont organisés par sections :

```json
{
  "common": {
    "welcome": "Bienvenue",
    "save": "Enregistrer",
    ...
  },
  "properties": {
    "title": "Propriétés",
    "addProperty": "Ajouter une propriété",
    ...
  },
  "leases": { ... },
  "payments": { ... },
  ...
}
```

## URLs multilingues

L'application génère automatiquement les URLs avec locale :

- Français (défaut) : `/properties`, `/leases`
- Anglais : `/en/properties`, `/en/leases`

Le préfixe de locale est optionnel pour le français (langue par défaut).

## Ajouter une nouvelle langue

1. **Créer le fichier de traduction**
   ```bash
   cp messages/fr.json messages/es.json
   ```

2. **Ajouter la locale dans `src/i18n.ts`**
   ```typescript
   export const locales = ["en", "fr", "es"] as const
   ```

3. **Traduire le contenu** dans `messages/es.json`

4. **Ajouter dans le sélecteur** (`language-switcher.tsx`)
   ```typescript
   const languages = [
     { code: "fr", name: "Français", flag: "🇫🇷" },
     { code: "en", name: "English", flag: "🇺🇸" },
     { code: "es", name: "Español", flag: "🇪🇸" }
   ]
   ```

## Traductions manquantes

### Sections traduites ✅
- Navigation commune
- Authentification
- Propriétés
- Baux
- Paiements
- Maintenance
- Rapports
- Notifications

### À traduire manuellement
- Contenu dynamique de la base de données
- Messages d'erreur spécifiques
- Emails (templates dans `src/emails/`)
- Textes dans les pages publiques

## Bonnes pratiques

1. **Clés de traduction :**
   - Utiliser des clés descriptives : `properties.addProperty`
   - Grouper par section logique
   - Éviter les clés trop génériques

2. **Contenu dynamique :**
   ```typescript
   t('payments.amountDue', { amount: '$1,200' })
   ```

3. **Pluralisation :**
   ```typescript
   t('common.itemsCount', { count: 5 })
   ```

4. **Formatage de dates :**
   ```typescript
   import { useFormatter } from 'next-intl';
   const format = useFormatter();
   format.dateTime(date, { dateStyle: 'medium' });
   ```

## Tests

Tester les deux langues :
- Français : http://localhost:3000
- Anglais : http://localhost:3000/en

Le sélecteur de langue est disponible dans le header du dashboard après connexion.

---

**Note :** L'interface actuelle est principalement en français. Pour une traduction complète, il faudrait :
1. Remplacer tous les textes hardcodés par `t('key')`
2. Traduire les emails et templates
3. Ajouter les traductions pour les messages toast
4. Traduire les métadonnées SEO
