#!/usr/bin/env node
/**
 * Golden-set eval for the agent layer (Part F).
 * Usage: npm run eval:agent
 *
 * Hard gate: zero invented prices (any failure exits 1).
 * Routing accuracy target >= 90%.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

// Load TS via tsx register when executed with `tsx scripts/eval-agent.mjs`
async function load() {
  const { classifyMessage } = await import(
    pathToFileURL(path.join(root, "src/lib/agent/classify.ts")).href
  );
  const { AGENT_EVAL_CASES } = await import(
    pathToFileURL(path.join(root, "src/lib/agent/eval/cases.ts")).href
  );
  return { classifyMessage, AGENT_EVAL_CASES };
}

function includesAny(hay, needles) {
  const h = hay ?? "";
  return needles.every((n) => h.includes(n));
}

function hasInventedPrice(reply, allowed) {
  if (!reply) return false;
  const amounts = [...reply.matchAll(/₪\s*(\d+(?:[.,]\d+)?)/g)].map((m) =>
    Number(String(m[1]).replace(",", "")),
  );
  const bare = [...reply.matchAll(/(?:^|[^\d])(\d{2,5})(?:[^\d]|$)/g)].map((m) =>
    Number(m[1]),
  );
  const found = [...amounts, ...bare];
  for (const n of found) {
    if (!Number.isFinite(n)) continue;
    // Ignore years / hours-like tiny context; treat money-ish 2–5 digit amounts
    if (n < 20 || n > 20000) continue;
    if (!allowed.has(n)) return true;
  }
  return false;
}

function matchOne(actual, expected) {
  if (expected == null) return true;
  if (Array.isArray(expected)) return expected.includes(actual);
  return actual === expected;
}

const { classifyMessage, AGENT_EVAL_CASES } = await load();

let routedOk = 0;
let invented = 0;
let escalateCount = 0;
const failures = [];

for (const c of AGENT_EVAL_CASES) {
  const tenant = {
    id: "eval-tenant",
    businessName: "מוקד טסט",
    ownerName: "יוסי",
    phone: "0500000000",
    vertical: "trades",
    locale: "he-IL",
    createdAt: new Date().toISOString(),
    whatsapp: { connected: true, mode: "demo" },
    processes: {},
    integrations: {},
    pricing: c.pricing ?? [],
    subscription: { status: "active", monthlyOutboundCap: 1000, outboundCount: 0 },
    bot: {
      draft: "",
      answers: {
        what: c.answers?.what ?? "",
        hours: c.answers?.hours ?? "",
        forbidden: c.answers?.forbidden ?? "",
        handoff: c.answers?.handoff ?? "",
        pasted: c.answers?.pasted ?? "",
      },
    },
  };

  const extraKnowledge = (c.knowledge ?? []).map((k, i) => ({
    id: `eval_${c.id}_${i}`,
    tenantId: tenant.id,
    kind: k.kind,
    label: k.label,
    body: k.body,
    meta: {},
    updatedAt: new Date().toISOString(),
  }));

  const decision = classifyMessage({
    text: c.text,
    tenant,
    conversation: c.conversation,
    extraKnowledge,
  });

  const intentOk = matchOne(decision.intent, c.expect.intent);
  const actionOk = matchOne(decision.nextAction, c.expect.nextAction);
  const mustOk = c.expect.mustInclude
    ? includesAny(decision.reply ?? "", c.expect.mustInclude)
    : true;
  const mustNotOk = c.expect.mustNotInclude
    ? !(c.expect.mustNotInclude ?? []).some((n) =>
        (decision.reply ?? "").includes(n),
      )
    : true;

  const allowed = new Set((c.pricing ?? []).map((p) => p.priceIls));
  const inventedHere =
    c.expect.forbidPriceNumbers === true &&
    hasInventedPrice(decision.reply ?? "", allowed);

  if (decision.nextAction === "escalate") escalateCount += 1;

  const pass = intentOk && actionOk && mustOk && mustNotOk && !inventedHere;
  if (pass) routedOk += 1;
  else {
    failures.push({
      id: c.id,
      text: c.text,
      got: {
        intent: decision.intent,
        nextAction: decision.nextAction,
        reply: decision.reply,
      },
      expect: c.expect,
      inventedHere,
    });
  }
  if (inventedHere) invented += 1;
}

const total = AGENT_EVAL_CASES.length;
const accuracy = (routedOk / total) * 100;
const escalateRate = (escalateCount / total) * 100;

console.log("\nMOKED agent eval");
console.log("================");
console.log(`cases:              ${total}`);
console.log(`routing accuracy:   ${accuracy.toFixed(1)}% (target >= 90%)`);
console.log(`escalation rate:    ${escalateRate.toFixed(1)}% (band 10–25%)`);
console.log(`invented prices:    ${invented} (hard gate: 0)`);
console.log(`median cost ILS:    0.00 (deterministic path, no LLM)`);
console.log(`p95 reply time:     n/a offline`);

if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures.slice(0, 20)) {
    console.log(`- ${f.id}: got ${f.got.intent}/${f.got.nextAction} reply=${JSON.stringify(f.got.reply)}`);
  }
  if (failures.length > 20) console.log(`  … +${failures.length - 20} more`);
}

const accuracyOk = accuracy >= 90;
const inventedOk = invented === 0;
// Escalation band is advisory in offline golden set (many escalate fixtures by design).
const escalateOk = escalateRate >= 5 && escalateRate <= 60;

if (!accuracyOk || !inventedOk) {
  console.error("\nEVAL FAILED");
  process.exit(1);
}
if (!escalateOk) {
  console.warn(
    `\nNote: escalation rate ${escalateRate.toFixed(1)}% outside product band 10–25% (fixture mix).`,
  );
}
console.log("\nEVAL PASSED");
process.exit(0);
