# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router entrypoints (`layout.tsx`, `page.tsx`) and global styles. Gameplay and UI blocks live in `components/`, while `lib/` holds Supabase clients, game systems, and supporting utilities (with matching unit tests under `lib/__tests__`). Shared helpers land in `utils/`. Database assets sit in `supabase/`—apply migrations from `supabase/migrations/` and follow `supabase/README.md` for setup. End-to-end specs live in `tests/`; Playwright artifacts stay in `test-results/`.

## Build, Test, and Development Commands
- `npm run dev` — launch the local development server on http://localhost:3000.
- `npm run build` / `npm run start` — create and serve a production build.
- `npm run lint` — run ESLint with the Next.js config; fix findings before opening a PR.
- `npm run test` / `npm run test:coverage` — execute Jest suites and report coverage (focus on `components` and `lib`).
- `npm run test:e2e` (`npm run test:e2e:ui` for guided debugging) — run Playwright flows defined in `tests/`.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation and ES module imports. React components and Zustand stores use PascalCase filenames (`CharacterCreation.tsx`), while functions, hooks, and variables use camelCase (`useCombatLog`). Supabase SQL tables and columns remain snake_case to match existing migrations. Run `npm run lint` before commits and enable ESLint plus Tailwind IntelliSense in your editor.

## Testing Guidelines
Add Jest specs alongside logic in `lib/__tests__` using the `*.test.ts` pattern. Mock Supabase calls where possible to keep tests deterministic. For Playwright, drive flows through the UI and prefer data attributes or accessible labels for selectors. Maintain or improve coverage reports produced by `npm run test:coverage`, and attach failing traces from `test-results/` when reporting issues.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commit style (`feat:`, `fix:`, `chore:`) as seen in `git log`. Keep subject lines under 72 characters and describe scope concisely. PRs should include: a short summary, testing notes (`npm run test`, `npm run test:e2e` as applicable), links to related issues, and UI screenshots for visual changes. Update docs (README, Supabase notes, or this guide) whenever behavior or setup expectations shift.

## Supabase & Environment Setup
Copy `.env.local.example` to `.env.local` and populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Run migrations by pasting SQL from `supabase/migrations/` into the Supabase SQL editor, then restart `npm run dev`. Keep environment secrets out of version control and rotate keys if exposed.
