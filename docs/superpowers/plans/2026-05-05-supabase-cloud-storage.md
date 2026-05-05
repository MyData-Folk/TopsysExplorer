# Supabase Cloud Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet "Cloud" optionnel à TopsysExplorer permettant à un utilisateur connecté (email/password Supabase) de sauvegarder et recharger ses rapports OccupancyData depuis Supabase.

**Architecture:** Couche additive — l'app reste 100% fonctionnelle sans compte. Supabase est initialisé via un singleton client. Un hook `useAuth` gère la session. Un onglet `CloudTab` + un modal `AuthModal` constituent toute l'UI cloud. Rien dans `useAppStore` ou `pdfParser` n'est modifié.

**Tech Stack:** `@supabase/supabase-js` v2, React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, lucide-react, framer-motion

---

## File Map

| Action | Fichier | Responsabilité |
|---|---|---|
| Create | `supabase/migration.sql` | Script SQL complet (table + RLS + grants) |
| Create | `.env.local` | Clés Supabase locales (non commité) |
| Update | `.env.example` | Template avec VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY |
| Update | `.gitignore` | Ajouter `.env.local` |
| Create | `src/lib/supabaseClient.ts` | Singleton createClient |
| Create | `src/lib/supabaseStorage.ts` | saveReport, listReports, downloadReport, deleteSupabaseReport |
| Create | `src/hooks/useAuth.ts` | Session React : user, loading, signIn, signUp, signOut |
| Create | `src/components/AuthModal.tsx` | Modal login/register email+password |
| Create | `src/components/CloudTab.tsx` | Onglet Cloud complet |
| Modify | `src/types.ts` | TabId += 'cloud' |
| Modify | `src/components/TabNav.tsx` | 6ème onglet Cloud + badge connecté |
| Modify | `src/App.tsx` | Import CloudTab, rendu conditionnel onglet cloud |

---

## Task 1: SQL migration + variables d'environnement

**Files:**
- Create: `supabase/migration.sql`
- Create: `.env.local`
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Créer le dossier supabase et le script SQL**

Créer `supabase/migration.sql` avec ce contenu exact :

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Table principale
create table public.user_reports (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  filename           text not null,
  period_str         text not null default '',
  establishment_name text not null default '',
  upload_date        timestamptz not null default now(),
  is_public          boolean not null default false,
  data               jsonb not null
);

-- Index pour listage rapide par propriétaire
create index on public.user_reports (owner_id, upload_date desc);

-- RLS
alter table public.user_reports enable row level security;

-- Propriétaire : lecture
create policy "owner select"
  on public.user_reports for select
  using (auth.uid() = owner_id);

-- Propriétaire : insertion
create policy "owner insert"
  on public.user_reports for insert
  with check (auth.uid() = owner_id);

-- Propriétaire : suppression
create policy "owner delete"
  on public.user_reports for delete
  using (auth.uid() = owner_id);

-- Accès API REST pour les utilisateurs connectés
grant select, insert, delete
  on public.user_reports
  to authenticated;
```

- [ ] **Step 2: Créer `.env.local` avec vos clés Supabase**

```
VITE_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Remplacer les valeurs avec celles trouvées dans : Supabase Dashboard → Settings → API.

- [ ] **Step 3: Mettre à jour `.env.example`**

Remplacer le contenu entier par :

```
# Supabase — récupérer ces valeurs dans : Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Step 4: Vérifier que `.env.local` est dans `.gitignore`**

Ouvrir `.gitignore`. Si la ligne `.env.local` n'existe pas, l'ajouter. Si `.gitignore` n't existe pas, le créer avec :

```
.env.local
node_modules/
dist/
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migration.sql .env.example .gitignore
git commit -m "feat: add Supabase migration SQL and env config"
```

---

## Task 2: Installer @supabase/supabase-js

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Installer la dépendance**

```bash
npm install @supabase/supabase-js
```

Vérifier que la sortie affiche `added X packages` sans erreur.

- [ ] **Step 2: Vérifier l'installation**

```bash
npm run lint
```

Résultat attendu : aucune erreur TypeScript (0 errors).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @supabase/supabase-js"
```

---

## Task 3: Client Supabase singleton

**Files:**
- Create: `src/lib/supabaseClient.ts`

- [ ] **Step 1: Créer le client singleton**

Créer `src/lib/supabaseClient.ts` :

```typescript
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis dans .env.local')
}

export const supabase = createClient(url, key)
```

- [ ] **Step 2: Vérifier le typage**

```bash
npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabaseClient.ts
git commit -m "feat: add Supabase singleton client"
```

---

## Task 4: Types et fonctions de storage

**Files:**
- Create: `src/lib/supabaseStorage.ts`

- [ ] **Step 1: Créer les types et fonctions CRUD**

Créer `src/lib/supabaseStorage.ts` :

```typescript
import { supabase } from './supabaseClient'
import { OccupancyData } from '../types'

export interface CloudReportMeta {
  id: string
  owner_id: string
  filename: string
  period_str: string
  establishment_name: string
  upload_date: string
}

export async function saveReport(report: OccupancyData): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  const { data, error } = await supabase
    .from('user_reports')
    .insert({
      owner_id: user.id,
      filename: report.fileName || 'rapport',
      period_str: report.periodStr || '',
      establishment_name: report.establishmentName || '',
      data: report,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erreur sauvegarde : ${error.message}`)
  return data.id
}

export async function listReports(): Promise<CloudReportMeta[]> {
  const { data, error } = await supabase
    .from('user_reports')
    .select('id, owner_id, filename, period_str, establishment_name, upload_date')
    .order('upload_date', { ascending: false })

  if (error) throw new Error(`Erreur listage : ${error.message}`)
  return data as CloudReportMeta[]
}

export async function downloadReport(id: string): Promise<OccupancyData> {
  const { data, error } = await supabase
    .from('user_reports')
    .select('data')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw new Error('Rapport introuvable ou accès refusé')
    throw new Error(`Erreur téléchargement : ${error.message}`)
  }

  const raw = data.data
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as OccupancyData }
    catch { throw new Error('Contenu JSON corrompu') }
  }
  return raw as OccupancyData
}

export async function deleteSupabaseReport(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_reports')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Erreur suppression : ${error.message}`)
}
```

- [ ] **Step 2: Vérifier le typage**

```bash
npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabaseStorage.ts
git commit -m "feat: add Supabase storage CRUD functions"
```

---

## Task 5: Hook useAuth

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Créer le hook de session**

Créer `src/hooks/useAuth.ts` :

```typescript
import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  return { user, loading, signIn, signUp, signOut }
}
```

- [ ] **Step 2: Vérifier le typage**

```bash
npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook for Supabase session"
```

---

## Task 6: Composant AuthModal

**Files:**
- Create: `src/components/AuthModal.tsx`

- [ ] **Step 1: Créer le modal d'authentification**

Créer `src/components/AuthModal.tsx` :

```typescript
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Mail, Lock, Cloud } from 'lucide-react'
import { AuthState } from '../hooks/useAuth'

interface AuthModalProps {
  auth: AuthState
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ auth, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        await auth.signIn(email, password)
      } else {
        await auth.signUp(email, password)
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surf1 border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif">
                {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
              </h2>
              <p className="text-[10px] text-text-dark uppercase tracking-widest">Cloud Storage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-dark hover:text-text rounded-lg hover:bg-surf2 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-text-dark uppercase mb-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-surf2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-gold outline-none transition-colors"
                placeholder="vous@exemple.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-dark uppercase mb-1">Mot de passe</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surf2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-gold outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red/10 border border-red/20 rounded-xl text-red text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-bg font-bold rounded-xl hover:bg-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
            className="text-xs text-text-dim hover:text-gold transition-colors"
          >
            {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier le typage**

```bash
npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthModal.tsx
git commit -m "feat: add AuthModal component for Supabase login/register"
```

---

## Task 7: Composant CloudTab

**Files:**
- Create: `src/components/CloudTab.tsx`

- [ ] **Step 1: Créer l'onglet Cloud**

Créer `src/components/CloudTab.tsx` :

```typescript
import { useState, useEffect, useCallback } from 'react'
import { Cloud, Upload, Download, Trash2, LogOut, User, AlertCircle, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { OccupancyData } from '../types'
import { AuthState } from '../hooks/useAuth'
import { AuthModal } from './AuthModal'
import {
  saveReport,
  listReports,
  downloadReport,
  deleteSupabaseReport,
  CloudReportMeta,
} from '../lib/supabaseStorage'

interface CloudTabProps {
  auth: AuthState
  activeReport: OccupancyData | null
  onAddReport: (r: OccupancyData) => void
  onShowToast: (msg: string, type?: 'ok' | 'error') => void
}

export function CloudTab({ auth, activeReport, onAddReport, onShowToast }: CloudTabProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [cloudReports, setCloudReports] = useState<CloudReportMeta[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const list = await listReports()
      setCloudReports(list)
    } catch (e: any) {
      setListError(e.message)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (auth.user) fetchList()
    else setCloudReports([])
  }, [auth.user, fetchList])

  const handleSave = async () => {
    if (!activeReport) { onShowToast('Aucun rapport actif à sauvegarder', 'error'); return }
    setActionLoading('save')
    try {
      await saveReport(activeReport)
      onShowToast('Rapport sauvegardé dans le cloud')
      fetchList()
    } catch (e: any) {
      onShowToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownload = async (id: string) => {
    setActionLoading(id)
    try {
      const data = await downloadReport(id)
      onAddReport(data)
      onShowToast('Rapport importé depuis le cloud')
    } catch (e: any) {
      onShowToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce rapport du cloud ?')) return
    setActionLoading(id + '-del')
    try {
      await deleteSupabaseReport(id)
      setCloudReports(prev => prev.filter(r => r.id !== id))
      onShowToast('Rapport supprimé')
    } catch (e: any) {
      onShowToast(e.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-surf1 p-5 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
            <Cloud size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold font-serif">Cloud Storage</h2>
            <p className="text-[10px] text-text-dark uppercase tracking-widest">Supabase</p>
          </div>
        </div>
        {auth.user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green/10 border border-green/20 rounded-lg">
              <User size={12} className="text-green" />
              <span className="text-xs text-green font-bold truncate max-w-[160px]">{auth.user.email}</span>
            </div>
            <button
              onClick={() => auth.signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surf2 border border-border rounded-lg text-xs font-bold text-text-dim hover:text-red hover:border-red/30 transition-colors"
            >
              <LogOut size={12} /> Déconnexion
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 bg-gold text-bg font-bold rounded-xl text-sm hover:bg-gold-light transition-all"
          >
            Se connecter
          </button>
        )}
      </div>

      {!auth.user ? (
        <div className="bg-surf1 border border-border rounded-2xl p-12 text-center">
          <Cloud size={40} className="text-text-dark mx-auto mb-4" />
          <p className="text-text-dim text-sm mb-6">
            Connectez-vous pour sauvegarder et retrouver vos rapports depuis n'importe quel appareil.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-3 bg-gold text-bg font-bold rounded-xl hover:bg-gold-light transition-all"
          >
            Se connecter / Créer un compte
          </button>
        </div>
      ) : (
        <>
          {/* Save active report */}
          <div className="bg-surf1 border border-border rounded-2xl p-5">
            <h3 className="text-[10px] font-bold text-text-dark uppercase tracking-widest mb-3">
              Rapport actif
            </h3>
            {activeReport ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-text">{activeReport.fileName || 'Rapport sans nom'}</p>
                  <p className="text-xs text-text-dim">{activeReport.periodStr} · {activeReport.establishmentName || '—'}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={actionLoading === 'save'}
                  className="flex items-center gap-2 px-4 py-2 bg-gold text-bg font-bold rounded-xl text-sm hover:bg-gold-light transition-all disabled:opacity-50"
                >
                  {actionLoading === 'save'
                    ? <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    : <Upload size={14} />}
                  Sauvegarder
                </button>
              </div>
            ) : (
              <p className="text-sm text-text-dim">Aucun rapport sélectionné.</p>
            )}
          </div>

          {/* Cloud reports list */}
          <div className="bg-surf1 border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold text-text-dark uppercase tracking-widest">
                Rapports sauvegardés ({cloudReports.length})
              </h3>
              <button
                onClick={fetchList}
                disabled={loadingList}
                className="p-1.5 text-text-dark hover:text-gold rounded-lg hover:bg-gold/10 transition-colors disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
              </button>
            </div>

            {listError && (
              <div className="p-3 bg-red/10 border border-red/20 rounded-xl flex items-center gap-2 text-red text-xs mb-4">
                <AlertCircle size={14} /> {listError}
              </div>
            )}

            {loadingList ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cloudReports.length === 0 ? (
              <p className="text-sm text-text-dim text-center py-8">Aucun rapport sauvegardé.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {cloudReports.map(r => (
                  <div key={r.id} className="group flex items-center justify-between p-3 bg-surf2 border border-transparent hover:border-border-hover rounded-xl transition-all">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-sm font-bold text-text truncate">{r.filename}</p>
                      <p className="text-[10px] text-text-dim">
                        {r.period_str && <span>{r.period_str} · </span>}
                        {r.establishment_name && <span>{r.establishment_name} · </span>}
                        <span>{new Date(r.upload_date).toLocaleDateString('fr-FR')}</span>
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(r.id)}
                        disabled={actionLoading === r.id}
                        className="p-1.5 text-text-dark hover:text-blue rounded-lg hover:bg-blue/10 transition-colors disabled:opacity-50"
                        title="Importer dans l'app"
                      >
                        {actionLoading === r.id
                          ? <div className="w-3 h-3 border border-blue border-t-transparent rounded-full animate-spin" />
                          : <Download size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={actionLoading === r.id + '-del'}
                        className="p-1.5 text-text-dark hover:text-red rounded-lg hover:bg-red/10 transition-colors disabled:opacity-50"
                        title="Supprimer du cloud"
                      >
                        {actionLoading === r.id + '-del'
                          ? <div className="w-3 h-3 border border-red border-t-transparent rounded-full animate-spin" />
                          : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            auth={auth}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => onShowToast('Connexion réussie')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier le typage**

```bash
npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CloudTab.tsx
git commit -m "feat: add CloudTab component with save/download/delete"
```

---

## Task 8: Étendre TabId + mettre à jour TabNav

**Files:**
- Modify: `src/types.ts` (ligne 65)
- Modify: `src/components/TabNav.tsx`

- [ ] **Step 1: Ajouter 'cloud' à TabId dans `src/types.ts`**

Ligne 65 actuelle :
```typescript
export type TabId = 'import' | 'analyse' | 'evolution' | 'settings' | 'help';
```

Remplacer par :
```typescript
export type TabId = 'import' | 'analyse' | 'evolution' | 'settings' | 'help' | 'cloud';
```

- [ ] **Step 2: Mettre à jour `src/components/TabNav.tsx`**

Remplacer le contenu entier par :

```typescript
import { FileUp, LayoutDashboard, Settings, GitCompareArrows, HelpCircle, Cloud } from 'lucide-react'
import { TabId } from '../types'
import { cn } from '../utils/cn'

const TABS = [
  { id: 'import' as TabId, label: 'Importer', icon: FileUp },
  { id: 'analyse' as TabId, label: 'Analyse & KPIs', icon: LayoutDashboard },
  { id: 'evolution' as TabId, label: 'Évolution', icon: GitCompareArrows },
  { id: 'settings' as TabId, label: 'Configuration', icon: Settings },
  { id: 'help' as TabId, label: 'Aide', icon: HelpCircle },
  { id: 'cloud' as TabId, label: 'Cloud', icon: Cloud },
]

interface TabNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isCloudConnected?: boolean
}

export function TabNav({ activeTab, onTabChange, isCloudConnected }: TabNavProps) {
  return (
    <nav className="flex px-8 border-b border-border bg-surf1 h-12 shrink-0 sticky top-0 z-50">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-5 border-b-2 text-xs font-semibold transition-all h-full outline-none",
            activeTab === tab.id
              ? "border-gold text-gold"
              : "border-transparent text-text-dim hover:text-text hover:border-border-hover"
          )}
        >
          <div className="relative">
            <tab.icon size={15} />
            {tab.id === 'cloud' && isCloudConnected && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green rounded-full" />
            )}
          </div>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Vérifier le typage**

```bash
npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/components/TabNav.tsx
git commit -m "feat: extend TabId with 'cloud' and update TabNav"
```

---

## Task 9: Intégrer CloudTab dans App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Ajouter les imports dans App.tsx**

En haut de `src/App.tsx`, après les imports existants, ajouter :

```typescript
import { useAuth } from './hooks/useAuth'
import { CloudTab } from './components/CloudTab'
```

- [ ] **Step 2: Initialiser useAuth dans le composant App**

Dans la fonction `App()`, après `const store = useAppStore()`, ajouter :

```typescript
const auth = useAuth()
```

- [ ] **Step 3: Passer isCloudConnected à TabNav**

Trouver la ligne :
```typescript
<TabNav activeTab={store.activeTab} onTabChange={store.setActiveTab} />
```

Remplacer par :
```typescript
<TabNav activeTab={store.activeTab} onTabChange={store.setActiveTab} isCloudConnected={!!auth.user} />
```

- [ ] **Step 4: Ajouter le rendu de l'onglet Cloud dans AnimatePresence**

Dans le bloc `<AnimatePresence mode="wait">`, après le bloc `settings` (avant `</AnimatePresence>`), ajouter :

```typescript
          {store.activeTab === 'cloud' && (
            <motion.div key="cloud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <CloudTab
                auth={auth}
                activeReport={store.activeReport}
                onAddReport={store.addReport}
                onShowToast={store.showToast}
              />
            </motion.div>
          )}
```

- [ ] **Step 5: Vérifier le typage**

```bash
npm run lint
```

Résultat attendu : 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate CloudTab in App with useAuth"
```

---

## Task 10: Test local complet

- [ ] **Step 1: Lancer le serveur de dev**

```bash
npm run dev
```

Ouvrir http://localhost:3000

- [ ] **Step 2: Vérifier l'onglet Cloud apparaît dans la navigation**

L'onglet "Cloud" doit être visible à droite de "Aide".

- [ ] **Step 3: Vérifier l'état non connecté**

Cliquer sur l'onglet Cloud → le message "Connectez-vous pour sauvegarder..." doit s'afficher avec un bouton "Se connecter".

- [ ] **Step 4: Tester l'ouverture du modal**

Cliquer sur "Se connecter" → le modal AuthModal doit s'ouvrir avec les champs email et mot de passe.

- [ ] **Step 5: Créer un compte de test**

Dans le modal, basculer en mode "S'inscrire", entrer un email de test et un mot de passe (6+ caractères), valider. Le modal doit se fermer et le badge email doit apparaître.

> **Note :** Vérifier dans Supabase Dashboard → Authentication → Users que l'utilisateur est créé.

- [ ] **Step 6: Tester la sauvegarde d'un rapport**

Importer un PDF dans l'onglet Import pour avoir un rapport actif. Retourner dans l'onglet Cloud, cliquer "Sauvegarder". Un toast "Rapport sauvegardé dans le cloud" doit apparaître et la liste doit se mettre à jour.

- [ ] **Step 7: Tester le téléchargement**

Cliquer sur l'icône Download d'un rapport dans la liste → un toast "Rapport importé depuis le cloud" doit apparaître et le rapport doit être visible dans l'onglet Import.

- [ ] **Step 8: Tester la suppression**

Cliquer sur l'icône Trash d'un rapport, confirmer → la ligne doit disparaître de la liste.

- [ ] **Step 9: Tester la déconnexion**

Cliquer "Déconnexion" → la liste disparaît, le message de connexion réapparaît. Le badge point vert dans la navigation doit disparaître.

- [ ] **Step 10: Vérifier que les autres onglets fonctionnent toujours**

Naviguer sur Import, Analyse, Evolution, Settings, Aide — vérifier qu'aucune régression n'est introduite.

- [ ] **Step 11: Build de production**

```bash
npm run build
```

Résultat attendu : build réussi sans erreur dans `dist/`.
