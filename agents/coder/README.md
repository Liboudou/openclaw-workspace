# menus-cantines

Projet Next.js qui expose les menus des cantines scolaires (multi-sites)

## Structure

- **Next.js (TypeScript, App Router, SSR/CSR)**
- **UI : shadcn/ui**
- Stockage in-memory pur : pas de DB
- Menus récupérés par scraping (script Node.js -> export data/*.ts|js utilisables côté serveur)
- Images : récupération auto Unsplash API (clé dans .env, fallback picsum.photos/gravatar, cache in-memory côté serveur)
- Tests Playwright E2E (navigation, données, images)
- Clés/API secrètes : .env, jamais hardcodées

## Arborescence recommandée

- `app/` : app Next.js (Pages/App Router, UI, SSR)
- `data/` : données générées (fichiers TS/JS exportant les menus)
- `scripts/` : crawling et récupération images
- `e2e/` : tests Playwright
- `types.ts` : types partagés entre scripts/data/app
- `README.md` : ce document
- `.env.example` : exemple fichier env clés api/images

## Initialisation

À la racine :

```bash
npm install
```

Récupérer d'abord les menus via :

```bash
node ./scripts/crawl-menus.js
```

## Workflow

1. Exécuter le crawler une fois (remplit `data/menus.ts`)
2. Lancer le serveur Next.js (`npm run dev`)
3. Les images sont chargées automatiquement/cachées côté serveur à la première requête
4. Tester la navigation, données et rendu images via Playwright (`npm run test:e2e`)


