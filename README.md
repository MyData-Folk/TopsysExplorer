# Topsys Planification Explorer

Analyseur de rapports d'occupation hôtelière issus du PMS **Topsys v8.5**. Application 100% client-side : aucune donnée ne quitte le navigateur.

## Fonctionnalités

- **Import PDF** — Drag & drop de rapports Topsys, parsing automatique des catégories de chambres
- **Dashboard d'analyse** — KPIs (taux d'occupation, RevPAR, CA, jour pic), graphiques et tableau jour par jour
- **Comparaison multi-périodes** — Overlay de graphiques, delta de KPIs, évolution par type de chambre
- **Multi-hôtel** — Gestion de plusieurs établissements avec configuration de parsing indépendante
- **Assistant de configuration** — Wizard 7 étapes pour configurer un nouvel hôtel à partir d'un PDF
- **Export** — Excel (XLSX), JSON, archivage local via File System Access API
- **Thème** — Dark / Light mode

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Styles | Tailwind CSS 4 |
| Graphiques | Recharts 3 |
| Animations | Framer Motion 12 |
| PDF | pdfjs-dist |
| Excel | SheetJS (xlsx) |
| Persistance | IndexedDB (idb-keyval) + localStorage |

## Lancer en local

```bash
npm install
npm run dev
```

L'application sera disponible sur `http://localhost:3000`.

## Build

```bash
npm run build
npm run preview
```

## Licence

Projet privé.
