# Ava Chat Performance Harness

This harness drives the live Ava API with reproducible customer, agent, and manager flows, then writes a JSON report under `perf/ava-chat/reports/`.

It is designed for the performance plan phases in this repo:

- baseline capture before changes
- regression capture after each performance phase
- API plus end-to-end chat UX timing

## What it measures

- customer message request latency
- time to next Ava reply becoming visible in the conversation
- support-side realtime visibility via `/api/realtime/events`
- handoff request, claim, resolve, rating, and return-to-AI timing
- manager dashboard refresh latency via `/api/manager/handoffs`
- server perf snapshots exposed by `AVA_PERF_METRICS=1`

## Inputs

The runner supports two modes:

1. `autoProvision.enabled = true`
   Creates temporary Supabase auth users, signs them in, and uses their access and refresh tokens directly as the API cookies expected by `api.aveyo.com`.

2. `users.customers / agents / managers`
   Supply explicit cookie strings if you want to run against fixed accounts instead of temporary ones.

The runner reads:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

from the environment unless they are overridden in your shell before launch.

## Local baseline run

1. Start the existing dev stack:

```bash
pnpm run orchestrate:dev
```

2. In a second shell, run the harness with perf mode enabled:

```bash
AVA_PERF_METRICS=1 AVA_LOAD_TEST_MODE=1 node --env-file=.env.local perf/ava-chat/run.mjs --tier small
```

3. Optional: use a custom config file

```bash
AVA_PERF_METRICS=1 AVA_LOAD_TEST_MODE=1 node --env-file=.env.local perf/ava-chat/run.mjs --config perf/ava-chat/config.example.json --tier target
```

## Regression gate

Run the same suite against a saved baseline and fail the command when latency or correctness budgets regress:

```bash
pnpm perf:ava-chat:gate:local -- --tier small
```

You can also pass an explicit baseline report and an optional custom gate file:

```bash
AVA_PERF_METRICS=1 AVA_LOAD_TEST_MODE=1 node --env-file=.env.local perf/ava-chat/run.mjs \
  --tier small \
  --baseline perf/ava-chat/reports/baseline-small-with-server-metrics.json \
  --gate-config perf/ava-chat/regression-gate.small.json
```

Behavior:

- `--baseline` turns on regression comparison and uses the built-in latency/correctness budgets by default
- `--gate-config` overrides those defaults with custom rule paths and thresholds
- the runner writes the comparison result into `report.regressionGate`
- the process exits non-zero when any required rule fails

## Report output

Each run writes a report like:

```text
perf/ava-chat/reports/2026-04-15T20-41-12-455Z-small.json
```

The report includes:

- scenario summaries with p50 / p95 / p99
- per-flow failure counts
- grouped server-side perf snapshots
- regression gate results when `--baseline` is provided
- route-level perf headers captured from API responses

## Notes

- The harness intentionally uses direct `ava-access-token` / `ava-refresh-token` cookies because that matches the API session contract used by `apps/api.aveyo.com/lib/auth/token.ts`.
- Auto-provisioned users are deleted at the end when `cleanupUsers` is enabled.
- The current transport is `poll`. The same harness can be extended to `sse` once the realtime stream route is in place.
