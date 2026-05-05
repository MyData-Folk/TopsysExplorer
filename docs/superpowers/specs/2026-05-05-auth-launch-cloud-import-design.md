# Design : Auth au lancement + Import cloud dans ImportTab

**Date :** 2026-05-05  
**Statut :** Approuvé  
**Scope :** Écran de connexion au lancement de l'app + section "Rapports cloud" dans l'onglet Importer + renommage des exports JSON

---

## 1. Objectif

1. Afficher un écran de connexion plein page au lancement de l'app, avant l'accès à l'interface principale.
2. Permettre à l'utilisateur de continuer sans compte (mode local).
3. Ajouter dans l'onglet Importer une section "Rapports cloud" listant les rapports Supabase de l'utilisateur connecté, avec prévisualisation avant import.
4. Renommer les exports JSON avec le format `{hotel}_{dateDebut}_{dateFin}.json`.

---

## 2. Architecture

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/components/LoginScreen.tsx` | Écran plein page connexion/inscription/skip |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/App.tsx` | Logique de gate : LoginScreen ou app selon état auth |
| `src/components/ImportTab.tsx` | Section cloud + prévisualisation + prop `auth` + renommage export JSON |
| `src/lib/supabaseStorage.ts` | Fonction `generateReportFilename` |

### Fichiers non modifiés

`useAuth.ts`, `AuthModal.tsx`, `CloudTab.tsx`, `SettingsTab.tsx`, `useAppStore.ts`, toute la logique PDF/analyse.

---

## 3. Logique d'affichage au lancement (App.tsx)

```typescript
const [skipAuth, setSkipAuth] = useState(false)

// Affichage :
if (auth.loading) → spinner plein écran centré
if (supabase === null) → skipAuth forcé true (cloud non disponible)
if (auth.user !== null || skipAuth) → <App normale />
sinon → <LoginScreen />
```

`skipAuth` est un état local React (non persisté) — à chaque rechargement de page, l'écran de connexion réapparaît si l'utilisateur n'a pas de session active.

---

## 4. LoginScreen.tsx

### Props
```typescript
interface LoginScreenProps {
  auth: AuthState
  onSkip: () => void
  supabaseAvailable: boolean
}
```

### Comportement

**Si `supabaseAvailable === false` :**
- Bannière discrète : "Cloud non disponible — mode local uniquement"
- Formulaire masqué
- Seul le bouton "Continuer sans compte →" est visible

**Si `supabaseAvailable === true` :**
- Logo "T" doré centré + titre + sous-titre
- Toggle Connexion / Créer un compte
- Champs email + mot de passe (avec icônes Mail, Lock)
- Bouton principal `bg-gold` : "Se connecter" / "Créer un compte"
- Erreur inline si échec
- Spinner pendant loading
- Séparateur `—` puis bouton discret "Continuer sans compte →"

### Comportement après connexion réussie
`auth.user` devient non-null → `useEffect` dans `App.tsx` détecte le changement → `LoginScreen` disparaît automatiquement (plus besoin de callback explicite).

---

## 5. ImportTab.tsx — Section cloud

### Nouvelle prop
```typescript
auth: AuthState
```

### Nouveaux états locaux
```typescript
cloudReports: CloudReportMeta[]
loadingCloud: boolean
cloudError: string | null
previewReport: CloudReportMeta | null
importingId: string | null
```

### Placement dans le JSX
Après la zone de drop existante, séparée par un `<hr>` ou `border-t`. Visible uniquement si `auth.user !== null`.

### Structure de la section
```
┌─────────────────────────────────────┐
│ ☁ Rapports cloud      [↻ Rafraîchir]│
├─────────────────────────────────────┤
│ [rapport 1 — clic pour aperçu]      │
│ ▼ Panneau prévisualisation          │
│   Nom : Folkestone_Opera_2024-01... │
│   Période : Janvier 2024            │
│   Hôtel : Folkestone Opera          │
│   Sauvegardé le : 05/05/2026        │
│   [Importer ce rapport] [Annuler]   │
│ [rapport 2]                         │
└─────────────────────────────────────┘
```

### Flux d'import cloud
1. Clic sur une ligne → `previewReport = r`
2. Panneau prévisualisation slide-down inline
3. Clic "Importer ce rapport" → `downloadReport(r.id)` → `hydrateReport(data)` → `onAddReport(data)` → `onSwitchToAnalyse()` → toast "Rapport importé depuis le cloud"
4. Clic "Annuler" → `previewReport = null`

---

## 6. Renommage JSON — generateReportFilename

### Fonction dans `src/lib/supabaseStorage.ts`
```typescript
export function generateReportFilename(report: OccupancyData, hotelName: string): string
```

### Format
```
{hotel}_{dateDebut}_{dateFin}.json
```
- `hotel` : `hotelName` avec espaces remplacés par `_` et caractères spéciaux retirés
- `dateDebut` / `dateFin` : extraits de `report.dateLabels[0].date` et `report.dateLabels[report.daysCount - 1].date`
- Format date : `YYYY-MM-DD`
- Si `date === null` : fallback sur `report.periodStr` sanitisé

**Exemple :** `Folkestone_Opera_2024-01-01_2024-01-31.json`

### Utilisation
1. `exportReportJson` dans `ImportTab.tsx` (bouton Download de la liste des rapports locaux)
2. `saveReport` dans `supabaseStorage.ts` — colonne `filename` en base

---

## 7. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Supabase non configuré | LoginScreen masqué, bouton "Continuer" seul visible |
| Connexion échouée | Erreur inline dans LoginScreen |
| Chargement liste cloud échoué | Message d'erreur rouge dans section cloud |
| Download rapport échoué | Toast erreur |
| `date === null` dans generateFilename | Fallback `periodStr` sanitisé |

---

## 8. Props passées depuis App.tsx

`ImportTab` reçoit déjà tous les handlers. Ajout de `auth` uniquement :
```typescript
auth={auth}
```

Le `auth` est déjà initialisé dans `App.tsx` via `useAuth()`.
