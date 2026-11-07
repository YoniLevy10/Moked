# MOKED — Product and Build Spec: the Conversational Agent Layer

This document redefines what MOKED sells and how, and instructs Cursor to build the
agent layer on top of the existing process engine. Every file path and type below was
checked against the code at commit `95da358`. Do not invent new structure where
something already exists.

---

## Part A — What we sell

**The line:** MOKED owns your WhatsApp conversations: it answers in your place, books
appointments, and keeps the money that would otherwise be lost.

**The measurable promise:** not "a bot", but three outcomes the owner sees on the
dashboard:
1. Zero leads left without a reply.
2. Fewer no-shows because of reminders.
3. More quotes sent and closed the same day.

**The load we remove:** a first reply within seconds at 23:00, on Friday, and while he
is on a ladder. Repeated questions about price, hours, service area and availability
stop reaching him.

**What we do not sell:** not "an AI agent that does everything". No legal or medical
advice, no financial decisions without approval, and no promise of availability that
was not checked against a real calendar.

**The model:** fixed monthly subscription (default ₪249, `MOKED_SUBSCRIPTION_ILS`), a
trial, and inbound conversation free. Meta message cost sits with the business and is
shown transparently.

---

## Part B — Four layers, each doing one thing

Today in code: `src/lib/processes/engine.ts` routes by regex and prefix, and each
process in `src/lib/processes/waves/*` is a deterministic state machine returning
`ProcessResult`. There is no understanding layer. That is what we add.

```
inbound message
   → 1. safety gate      opt-out / spam / duplicate / human mode
   → 2. understanding    intent + slots + confidence + language      <- new
   → 3. business knowledge  grounding in this tenant's data only     <- new
   → 4. execution        existing process engine, or a free reply    <- existing + new
```

Layer 2 does not replace layer 4. It decides **where** to route, fills missing slots,
and phrases the answer. The state machine stays the owner of every step in booking,
quote and payment, because improvisation there is unacceptable.

---

## Part C — Behavior rules (the core, read carefully)

### C.1 Decision order on every message
1. If `conversation.status === "human_takeover"`: do not reply, only record.
2. If the sender asked to stop or opt out: mark `optedOut`, reply one line, stop.
3. If a process is active (`activeProcess`) and the message continues it: continue it.
4. If the message asks something the active process was not built for: answer from
   business knowledge without breaking the flow.
5. If confidence is below threshold: one clarifying question. After a second failure:
   escalate.
6. If there is no source: do not guess. Say it will be checked and hand over to a human.

### C.2 What the agent may say
- **Allowed:** services, what is included, hours, service area, availability from the
  calendar, price from `pricing_items`, cancellation policy, how to arrive, what to
  bring, response times.
- **Never, in any phrasing:** a price that is not in the table, availability that was
  not checked, a discount that was not approved (discounted `Quote` requires human
  approval), a promise of an exact arrival time, binding medical/legal/technical
  diagnosis, a warranty commitment, or information about other customers.

### C.3 Fallback ladder: never get stuck
| Situation | What happens |
|---|---|
| Clear question with a source in business data | Answer, short, end with one follow-up question |
| Clear question, no source | "Good question, I am checking and will confirm" + `human.decision_needed` + escalate |
| Ambiguous message | One clarifying question only, with two options |
| Message unrelated to the business | One polite line, steer back on the next message, no lecture |
| Customer is angry | Brief acknowledgement, no double apology, escalate immediately |
| "Are you a bot?" | "Yes, I am the digital assistant of <business>. You can talk to <owner name> whenever you want" |
| Voice note or image | Ask for text; if no OCR, "could you write it to me in one line" |
| Duplicate or partial message | Merge by `wa_message_id`, never reply twice |
| Mixed language or typos | Pick one language and continue in it; never correct the customer |

### C.4 Style
One to three lines, no headings, no bullets, no emoji in every message. One question at
the end. Never "I am here to help". Never repeat what the customer wrote. Never explain
how the system works. Conversational Hebrew, Arabic with RTL when the customer opens in
Arabic, English only if the customer opened in English.

### C.5 Confidence and escalation
- `confidence >= 0.75` and a source exists: answer.
- `0.45 to 0.75`: answer partially and ask one clarifying question.
- `< 0.45`, or a money/legal/complaint topic, or an explicit request for a person:
  escalate immediately.
- Escalation means `conversation.status = "human_takeover"` + `human.decision_needed`
  event + a templated notification to the owner. Maximum two notifications per
  conversation.

### C.6 Clock and business hours
Inside business hours: escalate immediately. Outside hours: the agent keeps answering
and booking, and the escalation is delivered in the morning, except for money issues or
complaints which escalate immediately.

---

## Part D — What gets built

### D.1 New files
```
src/lib/agent/index.ts        // runAgentTurn(): the single entry point
src/lib/agent/classify.ts     // intent + slots + confidence + language
src/lib/agent/knowledge.ts    // tenant grounding retrieval
src/lib/agent/prompt.ts       // deterministic prompt construction
src/lib/agent/policy.ts       // confidence thresholds, forbidden topics, escalation
src/lib/agent/types.ts        // AgentDecision, AgentTurnResult
src/lib/agent/eval/cases.ts   // golden set
scripts/eval-agent.mjs        // npm run eval:agent
```

### D.2 Types
```ts
export type Intent =
  | "price_question" | "availability" | "book" | "cancel" | "reschedule"
  | "hours" | "service_area" | "service_info" | "complaint"
  | "human_request" | "opt_out" | "smalltalk" | "unknown";

export type AgentDecision = {
  intent: Intent;
  language: "he" | "ar" | "en";
  confidence: number;              // 0..1
  slots: Record<string, string | number | null>;
  groundings: { source: string; text: string }[];   // required for price or time
  nextAction: "reply" | "route_process" | "clarify" | "escalate" | "opt_out";
  processKey?: ProcessKey;
  reply?: string;
};

export type AgentTurnResult = { decision: AgentDecision; handled: boolean;
  replies: OutboundAction[]; conversationPatch?: Partial<Conversation>; events?: string[] };
```

### D.3 Tables and migration (`supabase/migrations/*_agent_layer.sql`)
```sql
alter table conversations add column agent jsonb not null default '{}';
-- agent = { stage, lastIntent, confidence, language, askedSlots, clarifyCount,
--           pendingQuestion, escalations, groundedCount }

create table tenant_knowledge (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  kind text not null,          -- service | price | hours | area | policy | faq | forbidden
  label text not null,
  body text not null,
  meta jsonb default '{}',
  updated_at timestamptz default now()
);
create index on tenant_knowledge (tenant_id, kind);
```

No embedding column at this stage. Retrieval by `kind` and keywords, with
`pricing_items` as the only price source. Vectors only if the Part F metrics show a
need.

### D.4 Wiring into the existing engine (mandatory, without breaking demo)
In `src/lib/processes/engine.ts`, in the function that receives an inbound message,
before `runActiveProcess()`:

```ts
const agent = await runAgentTurn({ tenant, conversation, inboundText });
if (agent.handled) return agent;              // free reply or escalation
// otherwise: route with the agent decision, then the existing engine
return runActiveProcess(tenant, conversation, inboundText, agent.decision);
```

`runAgentTurn` returns `handled: false` when an active process continues the message, or
when `MOKED_LLM_API_KEY` is absent. In that state the system must behave exactly as it
does today.

### D.5 Environment variables (some already in `.env.example`)
```
MOKED_LLM_API_KEY=
MOKED_LLM_MODEL=gpt-4o-mini
MOKED_AGENT_ENABLED=true
MOKED_AGENT_CONFIDENCE_REPLY=0.75
MOKED_AGENT_CONFIDENCE_CLARIFY=0.45
MOKED_AGENT_MAX_TURNS=6            # above this: escalate
MOKED_AGENT_MAX_COST_ILS=0.35      # per-conversation cost ceiling
MOKED_AGENT_DRY_RUN=false          # true = compute the decision, do not send
```

### D.6 Prompt skeleton (`prompt.ts`, Hebrew output, deterministic)
```
You are the assistant of {businessName}. You answer customers on WhatsApp.
Authorized information, only what appears here:
services: {services}
prices: {prices}
hours: {hours}
area: {area}
policies: {policies}
forbidden: {forbidden}
style: up to three lines, one question at the end, no emoji.
rules: never invent a price or availability. No source means nextAction=escalate and
reply "Good question, I am checking and will confirm". Active process: {activeProcess},
stage: {stage}, already asked: {askedSlots}. Return JSON matching the schema only.
```
Output is validated with Zod. Invalid output: one retry at temperature 0, then escalate.

### D.7 A small tool set for the agent
`check_availability(date)`, `start_booking(service, slot)`, `start_quote(service)`,
`escalate(reason)`. All of them call the existing functions in waves. No tool may write
a price or confirm an appointment without going through them.

---

## Part E — Preserve what exists (do not break)

- The deterministic engine stays the owner of Booking, Quote and Payment.
- `pricing_items` stays the single source of price.
- Demo mode (`whatsappMode: "demo"`) keeps working with no LLM key and no cost.
- `tenant.bot.answers` (what/hours/forbidden/handoff/pasted) remains supported and is
  injected into the prompt as is. Do not build a second settings system beside it.
- Every new business event is registered in `outcomes.ts`, not as a standalone event.

---

## Part F — How we know it is not making things up

**Golden set:** 60 baseline conversations in `src/lib/agent/eval/cases.ts`, each with
`expect: { intent, nextAction, mustInclude[], mustNotInclude[] }`. At minimum:
- 8 price questions, 3 of them about a service that does not exist (must escalate,
  must not invent a number)
- 8 booking conversations, including "tomorrow at 4" and "sometime next week"
- 6 conversations with typos and slang
- 6 conversations in Arabic
- 5 complaints and angry customers
- 4 explicit requests for a person
- 4 unrelated messages
- 3 attempts to extract a discount
- 2 duplicate messages
- 4 outside business hours

**Metrics:** routing accuracy >= 90%, zero invented prices (hard gate, any failure
blocks the merge), escalation rate 10 to 25% (below 10% suggests invention, above 25%
is not useful), median cost per conversation <= ₪0.05, p95 reply time <= 4 seconds.
`npm run eval:agent` runs it and prints a table. No merge without it green.

---

## Part G — Build order and acceptance

| # | Task | Acceptance |
|---|---|---|
| 1 | Types, migration, `tenant_knowledge`, seeding from `pricing_items` and `bot.answers` | `npm run build` clean, existing data intact |
| 2 | `classify.ts` + Zod + language fallback | All 60 cases return valid JSON, no crashes |
| 3 | `runAgentTurn` wired into engine, `handled:false` by default | Demo behaves exactly as today |
| 4 | Free replies with grounding and price policy | Zero invented prices in the golden set |
| 5 | Fallback ladder and escalation | Every "no source" case escalates and notifies |
| 6 | `eval:agent` green + `docs/AGENT.md` | All five metrics in range |

---

## Appendix — What the customer fills in once (5 minutes)
Business name, services and prices, hours, service area, what must never be said, who
receives escalations and when. All of it lands in `tenant_knowledge` and `bot.answers`.
Without that input the agent cannot go live, and the readiness gate (P0.3) shows exactly
what is missing.
