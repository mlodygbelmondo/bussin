# Bussin — agent-ready task pack

Paczka jest podzielona tak, żeby wrzucać agentom zadania etapami: najpierw backend, potem Stripe, potem ekrany.

> **2026-06-12 — single-window redesign.** Ekrany `03_screens/03`–`03_screens/08`
> są zastąpione przez `03_screens/11_single_window.md` (jedno okno czatu na
> `/dashboard`). Nie traktuj starych speców jako acceptance criteria. Design:
> `docs/plans/2026-06-12-single-window-redesign-design.md`, design system:
> `docs/design-system.md`, checklista przed wypuszczeniem: `docs/launch-checklist.md`.

> **2026-07-04 — legacy UI usunięte.** Moduły starych ekranów
> (`dashboard`, `generation` UI, `queue`, `library`, `scheduled` UI,
> `tracks` UI) zostały skasowane z repo; żywa logika mieszka w
> `src/modules/feed` i `src/server/services`. Słownik domeny:
> `.ai/CONTEXT.md`. Lista testidów: `docs/testids.md` (generowana przez
> `pnpm docs:testids`).

## Kolejność wykonywania

1. `01_backend/01_project_foundation.md`
2. `01_backend/02_supabase_database_rls_storage.md`
3. `01_backend/03_backend_services_validation.md`
4. `01_backend/04_supabase_queues_cron_worker.md`
5. `01_backend/05_integrations_suno_youtube.md`
6. `02_stripe/01_stripe_setup.md`
7. `03_screens/01_auth_login_signup.md`
8. `03_screens/02_onboarding_connect_accounts.md`
9. `03_screens/03_dashboard_home.md`
10. `03_screens/04_create_generation.md`
11. `03_screens/05_generation_queue.md`
12. `03_screens/06_track_preview_approval.md`
13. `03_screens/07_library.md`
14. `03_screens/08_scheduled_uploads.md`
15. `03_screens/09_channels_management.md`
16. `03_screens/10_billing_settings.md`
17. `04_tests/01_testing_plan.md`
18. `05_deployment/01_production_readiness.md`

## Finalny stack

- Next.js App Router
- TypeScript
- Supabase Auth / Postgres / RLS / Storage / Queues / Cron / Edge Functions
- Stripe
- External Node.js worker
- FFmpeg
- Vitest
- Playwright
- Tailwind + shadcn/ui
- Zod
- React Hook Form
- TanStack Query

## MVP flow

1. User rejestruje się.
2. App tworzy profile + workspace.
3. User łączy Suno.
4. User łączy YouTube.
5. User tworzy generation request.
6. System tworzy N tracków.
7. Worker wysyła joby do Suno.
8. Worker polluje Suno.
9. User odsłuchuje preview.
10. User approve/reject.
11. Worker renderuje MP4 przez FFmpeg.
12. User publikuje teraz albo planuje.
13. Worker uploaduje na YouTube.
14. Dashboard/library pokazują statusy.

## Zasady dla agentów

1. Jeden plik = jeden duży etap/PR albo zestaw blisko powiązanych tasków.
2. Backend taski muszą mieć testy unit/integration.
3. UI taski muszą mieć loading/empty/error states.
4. Każda mutacja ma walidację Zod po stronie serwera.
5. Żadne secrety nie mogą trafić do client bundle.
6. Supabase service role tylko w server/Edge Function/worker.
7. Wszystkie dane workspace-owned muszą respektować RLS.
8. Długie joby idą przez Supabase Queues.
9. FFmpeg tylko w external worker.
10. Stripe state ufamy tylko z webhooków.
11. YouTube/Suno adaptery muszą być mockowalne.
12. Każdy async status musi mieć czytelny `failure_reason`.
