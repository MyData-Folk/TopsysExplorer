# Design : Cloud Storage Supabase

**Date :** 2026-05-05  
**Statut :** Approuvé  
**Scope :** Intégration Supabase optionnelle pour sauvegarde/chargement de rapports OccupancyData

---

## 1. Objectif

Ajouter une couche cloud optionnelle à TopsysExplorer permettant à un utilisateur authentifié de sauvegarder ses rapports d'occupation dans Supabase et de les récupérer depuis n'importe quel navigateur. L'application reste 100% fonctionnelle sans compte (IndexedDB inchangé).

---

## 2. Architecture

### Principe directeur
Supabase est une fonctionnalité additive. Aucun fichier existant (`useAppStore`, `pdfParser`, `IndexedDB`) n'est modifié dans sa logique centrale.

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/supabaseClient.ts` | Singleton client Supabase (createClient) |
| `src/lib/supabaseStorage.ts` | CRUD : saveReport, listReports, downloadReport, deleteReport |
| `src/hooks/useAuth.ts` | État session React : user, loading, signIn, signUp, signOut |
| `src/components/CloudTab.tsx` | Onglet Cloud complet (connecté / non connecté) |
| `src/components/AuthModal.tsx` | Modal login/register email+password |
| `supabase/migration.sql` | Script SQL : table + RLS + grants |
| `.env.example` | Template variables d'environnement (mis à jour) |
| `.env.local` | Clés réelles locales (non commité, dans .gitignore) |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/types.ts` | `TabId` étendu avec `'cloud'` |
| `src/App.tsx` | Ajout onglet Cloud dans la navigation, passage des props |
| `src/components/TabNav.tsx` | 6ème onglet icône Cloud + badge connecté |

---

## 3. Base de données

### Table `user_reports`

```sql
create table public.user_reports (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  filename           text not null,
  period_str         text not null,
  establishment_name text not null default '',
  upload_date        timestamptz not null default now(),
  is_public          boolean not null default false,
  data               jsonb not null
);
```

### Optimisation listage
Le listage ne charge jamais `data` :
```sql
select id, owner_id, filename, period_str, establishment_name, upload_date
from user_reports
where owner_id = auth.uid()
order by upload_date desc;
```

### RLS
- Propriétaire : SELECT, INSERT, DELETE sur `owner_id = auth.uid()`
- UPDATE non exposé (pas de cas d'usage)
- Anonyme : aucun accès

---

## 4. Composants UI

### AuthModal
- Modal centré (overlay sombre)
- Deux modes togglables : **Connexion** / **Créer un compte**
- Champs : email, mot de passe
- Erreur inline (message Supabase traduit)
- Fermeture auto après succès

### CloudTab — État non connecté
- Message explicatif
- Bouton "Se connecter" → ouvre AuthModal

### CloudTab — État connecté
- Badge email utilisateur + bouton Déconnexion
- Bouton **"Sauvegarder le rapport actif"** → POST vers Supabase du rapport sélectionné dans le store
- Liste des rapports cloud : filename, period_str, establishment_name, upload_date
- Par ligne : bouton **Télécharger** (GET data + addReport dans le store) + bouton **Supprimer**
- États de chargement et messages d'erreur inline

### TabNav
- 6ème onglet label "Cloud", icône `Cloud` (lucide-react)
- Badge point vert si `user !== null`

---

## 5. Flux de données

```
[CloudTab] Sauvegarder
  → supabaseStorage.saveReport(activeReport)
  → INSERT INTO user_reports (owner_id, filename, period_str, establishment_name, data)
  → showToast('Rapport sauvegardé')

[CloudTab] Télécharger
  → supabaseStorage.downloadReport(id)
  → SELECT data FROM user_reports WHERE id = ?
  → onAddReport(data) → useAppStore → IndexedDB local
  → showToast('Rapport importé')

[CloudTab] Supprimer
  → supabaseStorage.deleteReport(id)
  → DELETE FROM user_reports WHERE id = ? AND owner_id = auth.uid()
  → refresh liste
```

---

## 6. Variables d'environnement

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- `.env.local` : clés réelles, non commité
- `.env.example` : template commité, valeurs vides

---

## 7. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Non connecté, action cloud | Bouton désactivé ou ouvre AuthModal |
| Erreur réseau | Toast erreur + log console |
| JSONB corrompu au download | Toast "Rapport invalide", aucun import |
| Doublon (même rapport sauvegardé 2x) | Nouvelle ligne créée (pas de déduplication — MVP) |
| Token expiré | Supabase SDK renouvelle automatiquement via refresh token |

---

## 8. Sécurité

- Clé `anon` uniquement dans le client frontend (jamais `service_role`)
- RLS activé sur toute la table
- Pas de `security definer` functions
- `.env.local` dans `.gitignore`
