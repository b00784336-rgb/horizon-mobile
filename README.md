# Horizon Mobile

Application React Native + Expo pour [horizondate.app](https://horizondate.app).

## Stack

- **Expo SDK 51** + Expo Router v3 (file-based navigation)
- **Supabase** — auth + base de données (même projet que le SaaS web)
- **Zustand** — state management
- **expo-in-app-purchases** — abonnements Apple IAP

## Configuration requise avant de lancer

### 1. Supabase
Dans `src/lib/supabase.ts`, remplace :
```
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```
par tes vraies clés (identiques au SaaS web).

### 2. EAS / Bundle ID
Dans `app.json`, le bundle ID est `com.horizondate.app`.
Dans les réglages EAS, remplace `YOUR_EAS_PROJECT_ID` par ton vrai project ID.

### 3. Produits IAP Apple
Les product IDs sont :
- `com.horizondate.monthly`
- `com.horizondate.yearly`

Ils doivent être créés sur App Store Connect avant de tester.

### 4. Deep link OAuth Google
Sur Supabase > Authentication > URL Configuration, ajoute :
```
horizondate://auth/callback
```

## Installation

```bash
npm install
npx expo start
```

## Build production iOS

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

## Structure des fichiers

```
app/
  _layout.tsx          # Root layout, auth listener
  index.tsx            # Redirect logic (login / onboarding / paywall / tabs)
  onboarding.tsx       # 6-step psychological onboarding
  paywall.tsx          # Hard paywall avec IAP
  (auth)/
    login.tsx
    signup.tsx
  (tabs)/
    _layout.tsx        # Tab bar config
    index.tsx          # Accueil — FIRE dashboard
    budget.tsx         # Budget par catégories
    patrimoine.tsx     # Actifs et patrimoine
    objectifs.tsx      # Objectifs financiers
    compte.tsx         # Profil, mode couple, déconnexion

src/
  lib/
    supabase.ts        # Client Supabase avec SecureStore
    store.ts           # Zustand store — état global
    calculations.ts    # Calcul FIRE (identique au web)
    iap.ts             # In-App Purchases helper
  constants/
    theme.ts           # Couleurs, spacing, radius
  components/
    ui/
      Button.tsx
      Card.tsx
      Input.tsx
    FireCountdown.tsx  # Widget FIRE principal
```

## Connexion avec le SaaS web

L'app se connecte **exactement** au même projet Supabase que le SaaS web.
Les tables utilisées sont :
- `profiles` — données utilisateur + abonnement
- `budget_categories` — catégories budget
- `assets` — actifs patrimoine
- `goals` — objectifs

Le champ `profiles.is_premium` est la source de vérité unique :
- Mis à `true` par le webhook Stripe (web)
- Mis à `true` par `/api/mobile/iap/verify` (iOS)

## Endpoint IAP à créer côté Next.js

L'app appelle `https://horizondate.app/api/mobile/iap/verify` pour valider les achats Apple.
Ce endpoint doit :
1. Vérifier le JWT Bearer dans le header Authorization
2. Valider le receipt auprès d'Apple
3. Mettre `profiles.is_premium = true` pour l'utilisateur
4. Retourner `{ success: true }`
