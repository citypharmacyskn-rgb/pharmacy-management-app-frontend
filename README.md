# MediCare Pharmacy — frontend

Vite + React app. Talks to the backend in `../backend` (or wherever you
deploy it) via `VITE_API_BASE_URL`.

## Run it

```bash
npm install
cp .env.example .env      # points at http://localhost:3001/api by default
npm run dev                # http://localhost:5173
```

Start the backend first (see backend/README.md) so there's something to
talk to — registration, login, and every page's data all come from there.

## What's real vs. what's a placeholder

- All page logic, permission gating, auth flow, and API calls are the real,
  tested code from earlier in this build.
- `src/components/ui/*` are hand-written, functional replacements for the
  shadcn/Radix components the original Base44 project used (those
  originals were never available to reconstruct exactly). They work —
  buttons click, dialogs open, selects select — but are plainer than a full
  Radix-based design system. Swap in real shadcn components later with
  `npx shadcn add button dialog select ...` if you want the polished
  version; the import paths (`@/components/ui/button`, etc.) already match.
- Google OAuth buttons redirect to the backend's `/auth/google`, which
  currently returns a 501 with setup instructions (no OAuth app is
  registered yet).

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to sanity-check it
```
