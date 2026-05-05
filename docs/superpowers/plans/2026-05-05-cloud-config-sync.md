# Cloud Config Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un utilisateur connecté de sauvegarder/charger sa `AppConfig` complète dans Supabase, avec chargement automatique silencieux au démarrage si l'option est activée.

**Architecture:** Nouvelle table `user_config` (contrainte UNIQUE sur owner_id, upsert). Trois fonctions ajoutées dans `supabaseStorage.ts`. Logique de chargement cloud dans `useAppStore` via `useEffect`. Section UI dans `SettingsTab`. Mise à jour `HelpTab`.

**Tech Stack:** `@supabase/supabase-js` v2, React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4

---

## File Map

| Action | Fichier | Responsabilité |
|---|---|---|
| Create | `supabase/migration_config.sql` | Table user_config + RLS + grants |
| Modify | `src/types.ts` | AppConfig += cloudSync: boolean |
| Modify | `src/utils/constants.ts` | DEFAULT_CONFIG += cloudSync: false |
| Modify | `src/lib/supabaseStorage.ts` | +saveConfig, +loadCloudConfig |
| Modify | `src/store/useAppStore.ts` | Chargement cloud au démarrage |
| Modify | `src/components/SettingsTab.tsx` | Section Cloud + prop auth |
| Modify | `src/App.tsx` | Passer auth à SettingsTab |
| Modify | `src/components/HelpTab.tsx` | FeatureCard Cloud + étape 6 |

---

## Task 1: SQL migration user_config

**Files:**
- Create: `supabase/migration_config.sql`

- [ ] **Step 1: Créer le fichier SQL**

Créer `supabase/migration_config.sql` avec ce contenu exact :

```sql
-- Table de configuration utilisateur (une ligne par utilisateur)
create table public.user_config (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null unique references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.user_config enable row level security;

create policy "owner select"
  on public.user_config for select
  using (auth.uid() = owner_id);

create policy "owner insert"
  on public.user_config for insert
  with check (auth.uid() = owner_id);

create policy "owner update"
  on public.user_config for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owner delete"
  on public.user_config for delete
  using (auth.uid() = owner_id);

-- Accès API REST
grant select, insert, update, delete
  on public.user_config
  to authenticated;

-- Trigger updated_at
create or replace function public.update_user_config_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_config_updated_at
  before update on public.user_config
  for each row execute function public.update_user_config_timestamp();
```

- [ ] **Step 2: Commit**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" add supabase/migration_config.sql
git -C "/c/Users/Farouk/TopsysExplorer-main" commit -m "feat: add user_config SQL migration"
```

---

## Task 2: Étendre AppConfig avec cloudSync

**Files:**
- Modify: `src/types.ts` (AppConfig, ligne 62 après archiveFolderName)
- Modify: `src/utils/constants.ts` (DEFAULT_CONFIG, ligne 56 après archiveFolderName)

- [ ] **Step 1: Ajouter `cloudSync` dans AppConfig**

Dans `src/types.ts`, l'interface `AppConfig` se termine à la ligne 62. Ajouter `cloudSync` après `archiveFolderName` :

```typescript
export interface AppConfig {
  selectedHotelId: string;
  hotels: HotelConfig[];
  pms: string;
  highOccupancyThreshold: number;
  lowOccupancyThreshold: number;
  currency: string;
  showCategoryLibres: boolean;
  dateFormat: 'full' | 'short' | 'day';
  xlsxName: string;
  useAveragePriceForRevenue: boolean;
  autoSave: boolean;
  theme: ThemeMode;
  archiveFolderName: string;
  cloudSync: boolean;
}
```

- [ ] **Step 2: Ajouter `cloudSync: false` dans DEFAULT_CONFIG**

Dans `src/utils/constants.ts`, ajouter `cloudSync: false` à la fin de `DEFAULT_CONFIG` :

```typescript
export const DEFAULT_CONFIG: AppConfig = {
  selectedHotelId: 'default',
  hotels: [DEFAULT_HOTEL],
  pms: 'topsys',
  highOccupancyThreshold: 70,
  lowOccupancyThreshold: 40,
  currency: '€',
  showCategoryLibres: true,
  dateFormat: 'full',
  xlsxName: 'Analyse_Occupation',
  useAveragePriceForRevenue: false,
  autoSave: true,
  theme: 'dark',
  archiveFolderName: 'topsys_archives',
  cloudSync: false,
};
```

- [ ] **Step 3: Vérifier le typage**

```bash
cd "/c/Users/Farouk/TopsysExplorer-main" && npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 4: Commit**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" add src/types.ts src/utils/constants.ts
git -C "/c/Users/Farouk/TopsysExplorer-main" commit -m "feat: add cloudSync field to AppConfig"
```

---

## Task 3: Fonctions saveConfig et loadCloudConfig

**Files:**
- Modify: `src/lib/supabaseStorage.ts`

- [ ] **Step 1: Ajouter les deux fonctions à la fin de `src/lib/supabaseStorage.ts`**

Ouvrir `src/lib/supabaseStorage.ts` et ajouter après `deleteSupabaseReport` :

```typescript
import { AppConfig } from '../types'

export async function saveConfig(config: AppConfig): Promise<void> {
  const client = requireClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const { error } = await client
    .from('user_config')
    .upsert(
      { owner_id: user.id, data: config },
      { onConflict: 'owner_id' }
    )

  if (error) throw new Error(`Erreur sauvegarde config : ${error.message}`)
}

export async function loadCloudConfig(): Promise<AppConfig | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('user_config')
    .select('data')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Erreur chargement config : ${error.message}`)
  }

  if (!data?.data) return null

  const raw = data.data
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as AppConfig }
    catch { return null }
  }
  return raw as AppConfig
}
```

Note: `OccupancyData` est déjà importé en haut du fichier. Ajouter `AppConfig` à la ligne d'import existante :

```typescript
import { OccupancyData, AppConfig } from '../types'
```

- [ ] **Step 2: Vérifier le typage**

```bash
cd "/c/Users/Farouk/TopsysExplorer-main" && npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" add src/lib/supabaseStorage.ts
git -C "/c/Users/Farouk/TopsysExplorer-main" commit -m "feat: add saveConfig and loadCloudConfig to supabaseStorage"
```

---

## Task 4: Chargement cloud au démarrage dans useAppStore

**Files:**
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Ajouter l'import et le useEffect de chargement cloud**

Dans `src/store/useAppStore.ts`, ajouter l'import en haut :

```typescript
import { loadCloudConfig } from '../lib/supabaseStorage'
import { supabase } from '../lib/supabaseClient'
```

Puis, dans `useAppStore`, après le useEffect qui persiste la config dans localStorage (actuellement autour de la ligne 85), ajouter :

```typescript
  // Chargement cloud au démarrage si cloudSync activé
  useEffect(() => {
    if (!config.cloudSync) return
    if (!supabase) return

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      loadCloudConfig()
        .then(cloudConfig => {
          if (cloudConfig) {
            setConfig({ ...DEFAULT_CONFIG, ...cloudConfig, cloudSync: true })
          }
        })
        .catch(() => { /* erreur réseau silencieuse */ })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Ajouter `DEFAULT_CONFIG` aux imports existants depuis `constants` :

```typescript
import { DEFAULT_CONFIG, DEFAULT_HOTEL, DEFAULT_IGNORE_PREFIXES } from '../utils/constants';
```

(`DEFAULT_CONFIG` est peut-être déjà importé — vérifier avant d'ajouter.)

- [ ] **Step 2: Vérifier le typage**

```bash
cd "/c/Users/Farouk/TopsysExplorer-main" && npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" add src/store/useAppStore.ts
git -C "/c/Users/Farouk/TopsysExplorer-main" commit -m "feat: load cloud config on startup when cloudSync enabled"
```

---

## Task 5: Section Cloud dans SettingsTab

**Files:**
- Modify: `src/components/SettingsTab.tsx`

- [ ] **Step 1: Ajouter la prop `auth` à l'interface `SettingsTabProps`**

Dans `src/components/SettingsTab.tsx`, l'interface `SettingsTabProps` commence à la ligne 10. Ajouter `auth` :

```typescript
import { AuthState } from '../hooks/useAuth'

interface SettingsTabProps {
  config: AppConfig;
  activeHotel: HotelConfig;
  onConfigChange: (c: AppConfig) => void;
  onUpdateHotel: (updates: Partial<HotelConfig>) => void;
  onAddHotel: (h: HotelConfig) => void;
  onDeleteHotel: (id: string) => void;
  onShowToast: (msg: string, type?: 'ok' | 'error') => void;
  onOpenWizard: () => void;
  onImportHotelJson: (data: any) => void;
  auth: AuthState;
}
```

Mettre à jour la signature de la fonction pour déstructurer `auth` :

```typescript
export function SettingsTab({ config, activeHotel, onConfigChange, onUpdateHotel, onAddHotel, onDeleteHotel, onShowToast, onOpenWizard, onImportHotelJson, auth }: SettingsTabProps) {
```

- [ ] **Step 2: Ajouter les imports nécessaires**

En haut du fichier, ajouter les imports manquants :

```typescript
import { Cloud, Upload, Download as DownloadIcon } from 'lucide-react'
import { useState as useLocalState } from 'react'
import { saveConfig, loadCloudConfig } from '../lib/supabaseStorage'
```

Note: `useState` est déjà importé dans le fichier. Utiliser le même import existant — ne pas dupliquer. Ajouter seulement les symbols manquants à l'import React existant et ajouter les imports Supabase.

Correction — ne pas importer `useState as useLocalState`. `useState` est déjà importé. Ajouter simplement deux nouveaux `useState` à la logique du composant. Et les imports :

```typescript
import { Cloud } from 'lucide-react'
import { saveConfig, loadCloudConfig } from '../lib/supabaseStorage'
import { AuthState } from '../hooks/useAuth'
```

- [ ] **Step 3: Ajouter les états locaux de loading**

Dans la fonction `SettingsTab`, après `const [saveFlash, setSaveFlash] = useState(false)`, ajouter :

```typescript
  const [savingCloud, setSavingCloud] = useState(false)
  const [loadingCloud, setLoadingCloud] = useState(false)
```

- [ ] **Step 4: Ajouter les handlers de sauvegarde et chargement cloud**

Après les handlers existants (`save`, `updateType`, etc.), ajouter :

```typescript
  const handleSaveConfig = async () => {
    setSavingCloud(true)
    try {
      await saveConfig(config)
      onShowToast('Configuration sauvegardée dans le cloud')
    } catch (e) {
      onShowToast(e instanceof Error ? e.message : 'Erreur inconnue', 'error')
    } finally {
      setSavingCloud(false)
    }
  }

  const handleLoadConfig = async () => {
    setLoadingCloud(true)
    try {
      const cloudConfig = await loadCloudConfig()
      if (!cloudConfig) { onShowToast('Aucune configuration cloud trouvée', 'error'); return }
      onConfigChange({ ...cloudConfig, cloudSync: config.cloudSync })
      onShowToast('Configuration cloud chargée')
    } catch (e) {
      onShowToast(e instanceof Error ? e.message : 'Erreur inconnue', 'error')
    } finally {
      setLoadingCloud(false)
    }
  }
```

- [ ] **Step 5: Ajouter la section Cloud dans le JSX**

Dans le panneau "Seuils & Préférences" (le second panneau dans la grille 2 colonnes), après le bloc `border-t` des boutons EXPORTER/IMPORTER (fin du div `lg:col-span-2`), ajouter la section Cloud **à l'intérieur du div `bg-surf1 p-6 rounded-2xl border border-border`** qui contient "Seuils & Préférences", après la div des boutons Export/Import (après la dernière `</div>` du `border-t border-border pt-4 mt-4`) :

```typescript
              {/* Cloud sync */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 text-gold font-serif text-sm mb-3">
                  <Cloud size={16} /> Cloud & Synchronisation
                </div>
                {!auth.user ? (
                  <p className="text-[11px] text-text-dark">
                    Connectez-vous dans l'onglet <strong className="text-text">Cloud</strong> pour synchroniser votre configuration.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <Toggle
                      label="Chargement auto au démarrage"
                      value={config.cloudSync}
                      onChange={v => save({ cloudSync: v })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSaveConfig}
                        disabled={savingCloud}
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-[11px] font-bold hover:bg-gold/20 transition-all disabled:opacity-50"
                      >
                        {savingCloud
                          ? <div className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                          : <Cloud size={12} />}
                        Sauvegarder
                      </button>
                      <button
                        onClick={handleLoadConfig}
                        disabled={loadingCloud}
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-surf3 border border-border rounded-xl text-[11px] font-bold hover:border-gold/30 transition-all disabled:opacity-50"
                      >
                        {loadingCloud
                          ? <div className="w-3 h-3 border border-text-dark border-t-transparent rounded-full animate-spin" />
                          : <Cloud size={12} />}
                        Charger
                      </button>
                    </div>
                  </div>
                )}
              </div>
```

- [ ] **Step 6: Vérifier le typage**

```bash
cd "/c/Users/Farouk/TopsysExplorer-main" && npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 7: Commit**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" add src/components/SettingsTab.tsx
git -C "/c/Users/Farouk/TopsysExplorer-main" commit -m "feat: add Cloud sync section in SettingsTab"
```

---

## Task 6: Passer auth à SettingsTab dans App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Ajouter `auth` aux props de SettingsTab**

Dans `src/App.tsx`, trouver le bloc `SettingsTab` (autour de la ligne 157) :

```typescript
              <SettingsTab
                config={store.config}
                activeHotel={store.activeHotel}
                onConfigChange={store.setConfig}
                onUpdateHotel={store.updateActiveHotel}
                onAddHotel={store.addHotel}
                onDeleteHotel={store.deleteHotel}
                onShowToast={store.showToast}
                onOpenWizard={() => setShowWizard(true)}
                onImportHotelJson={handleImportHotelJson}
              />
```

Remplacer par :

```typescript
              <SettingsTab
                config={store.config}
                activeHotel={store.activeHotel}
                onConfigChange={store.setConfig}
                onUpdateHotel={store.updateActiveHotel}
                onAddHotel={store.addHotel}
                onDeleteHotel={store.deleteHotel}
                onShowToast={store.showToast}
                onOpenWizard={() => setShowWizard(true)}
                onImportHotelJson={handleImportHotelJson}
                auth={auth}
              />
```

- [ ] **Step 2: Vérifier le typage**

```bash
cd "/c/Users/Farouk/TopsysExplorer-main" && npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" add src/App.tsx
git -C "/c/Users/Farouk/TopsysExplorer-main" commit -m "feat: pass auth prop to SettingsTab"
```

---

## Task 7: Mise à jour HelpTab

**Files:**
- Modify: `src/components/HelpTab.tsx`

- [ ] **Step 1: Ajouter l'import Cloud**

En haut de `src/components/HelpTab.tsx`, l'import lucide-react est à la ligne 2. Ajouter `Cloud` :

```typescript
import { FileUp, LayoutDashboard, GitCompareArrows, Settings, Sparkles, Download, FolderOpen, Moon, Sun, Bed, TrendingUp, BarChart3, Shield, Cloud } from 'lucide-react';
```

- [ ] **Step 2: Ajouter la FeatureCard Cloud**

Dans la grille des fonctionnalités (après la `FeatureCard` "100% local & privé"), ajouter :

```typescript
          <FeatureCard
            icon={Cloud}
            title="Cloud Storage"
            description="Sauvegardez vos rapports d'occupation et votre configuration hôtel dans le cloud Supabase. Retrouvez vos données sur n'importe quel appareil. Activez le chargement automatique au démarrage dans Configuration."
            color="blue"
          />
```

- [ ] **Step 3: Ajouter l'étape 6 dans le guide de démarrage rapide**

Dans la section `<div className="space-y-6">` du guide, après l'étape 5 (`Step number={5}`), ajouter :

```typescript
          <Step number={6} title="Synchroniser avec le cloud">
            <p>Connectez-vous dans l'onglet <strong>Cloud</strong> (icône nuage dans la navigation). Dans <strong>Configuration &gt; Cloud &amp; Synchronisation</strong>, cliquez sur <strong>Sauvegarder</strong> pour envoyer votre configuration hôtel dans Supabase.</p>
            <p className="mt-1">Activez <strong>Chargement auto au démarrage</strong> pour retrouver automatiquement votre configuration à chaque session, sur n'importe quel appareil.</p>
          </Step>
```

- [ ] **Step 4: Mettre à jour la description "100% local & privé"**

La `FeatureCard` "100% local & privé" a une description qui dit "Aucune donnée n'est envoyée à un serveur." — cette description n'est plus entièrement exacte. Mettre à jour :

```typescript
          <FeatureCard
            icon={Shield}
            title="Local & privé par défaut"
            description="Sans compte, tout reste dans votre navigateur (IndexedDB, localStorage). Avec un compte Supabase optionnel, vous pouvez synchroniser rapports et configuration dans le cloud — vous gardez le contrôle."
            color="amber"
          />
```

- [ ] **Step 5: Vérifier le typage**

```bash
cd "/c/Users/Farouk/TopsysExplorer-main" && npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 6: Commit**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" add src/components/HelpTab.tsx
git -C "/c/Users/Farouk/TopsysExplorer-main" commit -m "feat: update HelpTab with Cloud Storage feature and step 6"
```

---

## Task 8: Build de vérification + test local

- [ ] **Step 1: Build de production**

```bash
cd "/c/Users/Farouk/TopsysExplorer-main" && npm run build
```

Résultat attendu : build réussi sans erreur TypeScript dans `dist/`.

- [ ] **Step 2: Exécuter migration_config.sql dans Supabase**

Copier le contenu de `supabase/migration_config.sql` dans Supabase Dashboard → SQL Editor → New Query → Run.

Vérifier que la table `user_config` apparaît dans Table Editor.

- [ ] **Step 3: Tester le flux complet**

Ouvrir `http://localhost:3001` (ou relancer `npm run dev`).

1. Onglet Cloud → se connecter
2. Onglet Configuration → section "Cloud & Synchronisation" visible avec toggle + boutons
3. Cliquer "Sauvegarder" → toast "Configuration sauvegardée dans le cloud"
4. Vérifier dans Supabase Dashboard → Table Editor → `user_config` qu'une ligne existe
5. Activer "Chargement auto au démarrage" → cliquer "Sauvegarder"
6. Rafraîchir la page → la configuration doit se recharger silencieusement depuis le cloud
7. Onglet Aide → vérifier la FeatureCard "Cloud Storage" et l'étape 6

- [ ] **Step 4: Commit final si tout est OK**

```bash
git -C "/c/Users/Farouk/TopsysExplorer-main" log --oneline -10
```

Vérifier que tous les commits attendus sont présents.
