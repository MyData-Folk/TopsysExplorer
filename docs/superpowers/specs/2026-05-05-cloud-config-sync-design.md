# Design : Cloud Config Sync

**Date :** 2026-05-05  
**Statut :** Approuvé  
**Scope :** Sauvegarde/chargement de `AppConfig` dans Supabase + option de chargement automatique au démarrage + mise à jour HelpTab

---

## 1. Objectif

Permettre à un utilisateur connecté de sauvegarder sa configuration complète (`AppConfig` — hôtels, seuils, thème, préférences) dans Supabase et de la récupérer automatiquement au démarrage de chaque session. Une seule config par utilisateur (upsert). L'app reste 100% fonctionnelle sans compte.

---

## 2. Architecture

### Principe directeur
Ajout additif : aucune logique existante de `useAppStore` n'est cassée. Le chargement cloud intervient après le chargement local, le remplace silencieusement si `cloudSync === true`.

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migration_config.sql` | Table `user_config` + contrainte unique + RLS + grants |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/types.ts` | `AppConfig` += `cloudSync: boolean` |
| `src/utils/constants.ts` | `DEFAULT_CONFIG` += `cloudSync: false` |
| `src/lib/supabaseStorage.ts` | Ajout `saveConfig`, `loadCloudConfig`, `hasCloudConfig` |
| `src/store/useAppStore.ts` | Chargement cloud au démarrage si `cloudSync && user` |
| `src/components/SettingsTab.tsx` | Section "Cloud & Synchronisation" + props `auth` |
| `src/App.tsx` | Passer `auth` à `SettingsTab` |
| `src/components/HelpTab.tsx` | FeatureCard Cloud + étape 6 guide |

---

## 3. Base de données

### Table `user_config`

```sql
create table public.user_config (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_config enable row level security;

create policy "owner select" on public.user_config for select using (auth.uid() = owner_id);
create policy "owner insert" on public.user_config for insert with check (auth.uid() = owner_id);
create policy "owner update" on public.user_config for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner delete" on public.user_config for delete using (auth.uid() = owner_id);

grant select, insert, update, delete on public.user_config to authenticated;
```

**Contrainte `unique` sur `owner_id`** — garantit une seule ligne par utilisateur. L'upsert utilise `ON CONFLICT (owner_id) DO UPDATE`.

---

## 4. Types

### `src/types.ts`

Ajouter dans `AppConfig` :
```typescript
cloudSync: boolean  // active le chargement automatique au démarrage
```

### `src/utils/constants.ts`

Ajouter dans `DEFAULT_CONFIG` :
```typescript
cloudSync: false,
```

---

## 5. Fonctions Supabase Storage

### Ajout dans `src/lib/supabaseStorage.ts`

```typescript
// Sauvegarde (upsert) la config complète
saveConfig(config: AppConfig): Promise<void>

// Charge la config depuis le cloud
loadCloudConfig(): Promise<AppConfig | null>
```

**`saveConfig`** : upsert via `INSERT INTO user_config ... ON CONFLICT (owner_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`.

**`loadCloudConfig`** : SELECT unique par `owner_id = auth.uid()`. Retourne `null` si pas de ligne ou erreur réseau.

---

## 6. Logique de démarrage (`useAppStore`)

```
1. loadConfig() depuis localStorage → config locale (comportement actuel inchangé)
2. useEffect au mount :
   - Si supabase === null → stop
   - Si config.cloudSync === false → stop
   - getUser() → si user === null → stop
   - loadCloudConfig() → si null ou erreur → stop silencieusement
   - setConfig(cloudConfig) — remplace en mémoire, pas de toast, pas d'écriture localStorage
```

**Ordre des événements :** l'app s'affiche d'abord avec la config locale (instantané), puis se met à jour avec la config cloud si disponible (async, quelques ms).

---

## 7. UI — SettingsTab

### Nouvelle prop
`SettingsTab` reçoit `auth: AuthState` (passé depuis `App.tsx` via `auth = useAuth()` déjà initialisé).

### Nouvelle section dans le panneau "Seuils & Préférences"

Ajoutée après les toggles existants, séparée par un `border-t` :

**Si `auth.user === null` :**
```
Message : "Connectez-vous dans l'onglet Cloud pour synchroniser votre configuration."
```

**Si `auth.user !== null` :**
- Toggle **"Chargement auto au démarrage"** → `save({ cloudSync: v })`
- Bouton **"Sauvegarder dans le cloud"** → appelle `saveConfig(config)` → toast "Configuration sauvegardée"
- Bouton **"Charger depuis le cloud"** → appelle `loadCloudConfig()` → `setConfig(result)` → toast "Configuration cloud chargée"
- États loading individuels sur chaque bouton

---

## 8. UI — HelpTab

### Nouvelle FeatureCard (grille des fonctionnalités)
```
icon: Cloud (lucide-react)
title: "Cloud Storage"
color: "blue"
description: "Sauvegardez vos rapports d'occupation et votre configuration hôtel dans le cloud Supabase. Retrouvez vos données sur n'importe quel appareil. Activez le chargement automatique au démarrage dans Configuration."
```

### Nouvelle étape 6 dans le guide de démarrage rapide
```
title: "Synchroniser avec le cloud"
content: Connectez-vous dans l'onglet Cloud. Dans Configuration > Cloud & Synchronisation, sauvegardez votre config hôtel et activez le chargement automatique au démarrage.
```

---

## 9. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Supabase non configuré (pas de clés) | Silencieux — section Cloud masquée dans Settings |
| Erreur réseau au démarrage | Silencieux — config locale conservée |
| Erreur lors de saveConfig | Toast erreur avec message |
| Erreur lors de loadCloudConfig manuel | Toast erreur avec message |
| Config cloud incomplète (champ manquant) | Merge avec DEFAULT_CONFIG pour combler les manques |

---

## 10. Sécurité

- RLS activé : chaque utilisateur ne voit que sa propre ligne
- Contrainte UNIQUE sur `owner_id` : impossible d'insérer deux configs pour le même utilisateur
- `cloudSync: false` par défaut : aucun effet réseau sans action explicite de l'utilisateur
- Clé `anon` uniquement côté client
