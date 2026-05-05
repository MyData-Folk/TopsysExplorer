# Architecture Modulaire — TopsysExplorer vers Plateforme RMS/Yield

**Date :** 2026-05-05  
**Statut :** Approuvé  
**Contexte :** Consolidation de TopsysExplorer avant l'ajout de modules RMS, Yield Management, Tarifs, et Forecasting.

---

## 1. Architecture actuelle

### Modules fonctionnels existants

| Module | Fichiers clés | Responsabilité |
|--------|--------------|----------------|
| PDF Parser | `src/lib/pdfParser.ts` | Extraction données Topsys v8.5 |
| State global | `src/store/useAppStore.ts` | Source de vérité unique (config + rapports) |
| Persistance locale | `localStorage` + `IndexedDB` | Config hôtels, rapports offline |
| Auth | `src/hooks/useAuth.ts`, `src/components/LoginScreen.tsx` | Supabase Auth, optionnelle |
| Cloud sync | `src/lib/supabaseClient.ts`, `src/lib/supabaseStorage.ts` | Sync config + rapports Supabase |
| UI tabs | `src/App.tsx`, `src/components/TabNav.tsx` | Routage onglets (6 tabs : Import, Analyse, Évolution, Configuration, Aide, Cloud) |

### Données partagées — le "bus" inter-modules

Ces types sont les seuls points de contact entre TopsysExplorer et les futurs modules :

- `HotelConfig` (`src/types.ts`) — profil hôtel : types de chambres, capacités, prix de base
- `OccupancyData` (`src/types.ts`) — rapport parsé : occupation par jour et par type de chambre
- `AppConfig` (`src/types.ts`) — config globale : seuils, thème, hôtel sélectionné
- `useAuth()` (`src/hooks/useAuth.ts`) — état d'authentification Supabase

### Tables Supabase existantes (ne pas modifier)

- `configs` — configuration hôtels synchronisée
- Storage bucket `reports` — rapports PDF et données parsées

---

## 2. Architecture cible — règles pour les futurs modules

### Principe d'isolation

Chaque nouveau module est un onglet indépendant structuré ainsi :

```
src/modules/<nom>/
  components/       # Composants UI du module
  hooks/            # Hooks locaux au module
  lib/
    supabase<Nom>.ts  # Requêtes Supabase du module (sa table uniquement)
  types.ts          # Types internes du module
  index.tsx         # Composant racine exporté vers App.tsx
```

### Ce qu'un module PEUT utiliser

| Ressource partagée | Usage autorisé |
|-------------------|---------------|
| `useAppStore()` | Lire `activeHotel`, `reports`, `config` — **lecture seule** |
| `useAuth()` | État de connexion, user Supabase |
| `supabase` client | Sa propre table uniquement |
| Design system | Classes Tailwind existantes, Framer Motion, Recharts, lucide-react |
| `src/utils/cn.ts` | Utilitaire classnames |

### Ce qu'un module NE FAIT PAS

- Écrire dans `useAppStore` pour stocker ses propres données
- Modifier `src/types.ts` pour ses types internes (fichier `types.ts` local dans son dossier)
- Importer directement depuis un autre module (`src/modules/<autre>/`)
- Lire ou écrire dans les tables Supabase d'un autre module

### Sens de flux des données

```
TopsysExplorer (produit) → useAppStore → Modules RMS/Yield/etc. (consomment)
```

Les modules en aval lisent les données d'occupation et de profil hôtel. Ils ne les modifient pas.

### Ajouter un module — 3 touchpoints dans le code existant

1. **`src/types.ts`** — ajouter l'ID à l'union `TabId`
2. **`src/components/TabNav.tsx`** — ajouter l'entrée dans le tableau `TABS`
3. **`src/App.tsx`** — ajouter le `case` dans `<AnimatePresence>`

Le reste est isolé dans `src/modules/<nom>/`.

---

## 3. Règles Supabase pour les nouveaux modules

- Tables nommées avec préfixe `<module>_` (ex: `rms_rates`, `yield_rules`, `pricing_plans`)
- Chaque module a son propre fichier de requêtes Supabase dans `src/modules/<nom>/lib/`
- Le client `supabase` depuis `src/lib/supabaseClient.ts` est partagé — c'est le seul import cross-module autorisé côté Supabase

---

## 4. Règles de cohérence visuelle

- Couleur primaire : classes `text-gold`, `bg-gold`, `border-gold`
- Thème dark/light : toujours via `data-theme` sur `<html>`, jamais de couleurs hardcodées
- Animations : Framer Motion — pattern `{ opacity: 0, y: 10 }` → `{ opacity: 1, y: 0 }` pour les entrées de tab
- Notifications : prop `onShowToast(message, type)` passée depuis `App.tsx`
- Arrondis : `rounded-xl` (cards), `rounded-3xl` (modals)
- Typographie : `text-xs font-semibold` pour les labels, `text-xl font-bold` pour les titres de section

---

## 5. Modules futurs identifiés

| Module | Description | Données consommées |
|--------|-------------|-------------------|
| RMS Dashboard | KPIs RevPAR, ADR, TRevPAR par hôtel | `OccupancyData`, `HotelConfig` |
| Yield Management | Règles de pricing dynamique | `OccupancyData`, tables `yield_*` |
| Tarifs & Plans | Grilles tarifaires, saisons | Tables `pricing_*` (Supabase dédié) |
| Forecasting | Prévisions d'occupation | `OccupancyData` historique |

Chaque module fera l'objet de son propre spec avant implémentation.
