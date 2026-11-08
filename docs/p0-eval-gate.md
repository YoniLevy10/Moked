# P0 eval gate

**Main SHA:** `ab5a161533641dd76df24a76a49796a2f8eeebd9` (readiness/availability merge #39)  
**Ran:** 2026-11-08 on Cloud Agent VM  
**Code change:** none — no fix PR

## Verdict: PASS

| Gate | Result | Threshold |
|---|---|---|
| `npm run eval:agent` | **PASSED** (exit 0) | accuracy ≥90%, invented prices = 0 |
| Invented prices | **0** | hard gate 0 |
| Unexpected escalations | **0** | fix PR only if >3 |
| Synthetic escalate rate | 31.7% (19/60) | advisory only — do not tune (preferences) |
| `npm test` | **56/56 pass**, 0 fail | related unit suite |

## Eval summary

```
cases:              60
routing accuracy:   93.3% (target >= 90%)
escalation rate:    31.7% (band 10–25%)
invented prices:    0 (hard gate: 0)
```

Runner: `scripts/eval-agent.mjs` + `src/lib/agent/eval/cases.ts` (deterministic classifier; no LLM).

## Unexpected escalations

Definition: `nextAction === "escalate"` **and** `"escalate"` ∉ golden `expect.nextAction`.

**List: empty (0).** Gate ≤3 → no over-escalation fix PR.

Soft-allow escalations (golden already permits escalate among other actions — not counted unexpected):

| Case | Expect nextAction |
|---|---|
| `price-known-5` | reply / escalate / clarify |
| `ar-1` | reply / escalate / clarify |
| `ar-4` | escalate / clarify |
| `ar-6` | escalate / clarify |

## Routing failures (not unexpected escalations)

Eval still **PASSED** (accuracy 93.3%). These four under-route / mismatch cases got `unknown`/`route_process` instead of allowed escalate|clarify|reply — **not** false-positive escalations; left untouched per preferences (no threshold tuning).

| Case | Got | Note |
|---|---|---|
| `typo-4` | unknown / route_process | under-route |
| `unrelated-1` | unknown / route_process | under-route |
| `unrelated-2` | unknown / route_process | under-route |
| `unrelated-3` | unknown / route_process | under-route |

## Related unit tests

`npm test` on same SHA: **56 pass / 0 fail**, including readiness live webhook probes, trades availability slots, Meta signature fail-closed, webhook statuses/idempotency, payment webhook lock, conversation IDOR.

## Fix PR

**No code change needed.** Unexpected escalations = 0; invented prices = 0; eval + unit suite green on `ab5a161`.
