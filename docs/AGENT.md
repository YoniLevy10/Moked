# MOKED agent layer

Source of truth for behavior, thresholds, and eval: [`MOKED-AGENT-SPEC-EN.md`](./MOKED-AGENT-SPEC-EN.md).

Locked product pricing (overrides Part A ₪249 in the spec):

| Env | Default |
|-----|---------|
| `MOKED_SETUP_FEE_ILS` | 690 |
| `MOKED_SUBSCRIPTION_ILS` | 299 |
| `MOKED_ANNUAL_ILS` | 2990 |

## Layout

| Path | Role |
|------|------|
| `src/lib/agent/index.ts` | `runAgentTurn` — engine entry |
| `src/lib/agent/classify.ts` | Deterministic intent + slots + language |
| `src/lib/agent/knowledge.ts` | `tenant_knowledge` + `pricing_items` grounding |
| `src/lib/agent/policy.ts` | Confidence ladder / escalation caps |
| `src/lib/agent/prompt.ts` | LLM prompt skeleton (optional) |
| `src/lib/agent/eval/cases.ts` | 60 golden conversations |
| `scripts/eval-agent.mjs` | `npm run eval:agent` |

## Runtime rules

1. `conversation.status === "human_takeover"` → no reply.
2. Active process → `handled: false`, deterministic engine owns booking/quote/payment.
3. No LLM key → deterministic grounded FAQs only (zero cost). Never invent prices.
4. Unknown priced service → escalate with “בודק ואחזור” — hard gate in eval.
5. Max two escalation notifies per conversation.

## Commands

```bash
npm run eval:agent
npm run build
npm run smoke:wave-a
```

## Migration

`supabase/migrations/20261107190000_agent_layer.sql` adds `conversations.agent` jsonb and `tenant_knowledge`.
