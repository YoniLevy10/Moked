import { nanoid } from "nanoid";
import {
  KnowledgeKind,
  TenantKnowledgeRow,
} from "@/lib/agent/types";
import { Tenant } from "@/lib/types";
import * as fileStore from "@/lib/store/file-db";
import { getRemote, hasRemoteDb } from "@/lib/db/remote";

export type Grounding = { source: string; text: string };

function isRemote(): boolean {
  return hasRemoteDb();
}

/** Seed knowledge rows from pricing_items + bot.answers (idempotent labels). */
export function knowledgeFromTenant(tenant: Tenant): TenantKnowledgeRow[] {
  const now = new Date().toISOString();
  const rows: TenantKnowledgeRow[] = [];

  for (const item of tenant.pricing ?? []) {
    rows.push({
      id: `price_${item.id}`,
      tenantId: tenant.id,
      kind: "price",
      label: item.name,
      body: `${item.name}: ₪${item.priceIls}${
        item.description ? ` — ${item.description}` : ""
      }`,
      meta: { pricingItemId: item.id, priceIls: item.priceIls },
      updatedAt: now,
    });
    rows.push({
      id: `service_${item.id}`,
      tenantId: tenant.id,
      kind: "service",
      label: item.name,
      body: item.description?.trim() || item.name,
      meta: { pricingItemId: item.id },
      updatedAt: now,
    });
  }

  const a = tenant.bot?.answers;
  if (a?.what?.trim()) {
    rows.push({
      id: `faq_what_${tenant.id}`,
      tenantId: tenant.id,
      kind: "faq",
      label: "what",
      body: a.what.trim(),
      meta: {},
      updatedAt: now,
    });
  }
  if (a?.hours?.trim()) {
    rows.push({
      id: `hours_${tenant.id}`,
      tenantId: tenant.id,
      kind: "hours",
      label: "hours",
      body: a.hours.trim(),
      meta: {},
      updatedAt: now,
    });
  }
  if (a?.forbidden?.trim()) {
    rows.push({
      id: `forbidden_${tenant.id}`,
      tenantId: tenant.id,
      kind: "forbidden",
      label: "forbidden",
      body: a.forbidden.trim(),
      meta: {},
      updatedAt: now,
    });
  }
  if (a?.handoff?.trim()) {
    rows.push({
      id: `policy_handoff_${tenant.id}`,
      tenantId: tenant.id,
      kind: "policy",
      label: "handoff",
      body: a.handoff.trim(),
      meta: {},
      updatedAt: now,
    });
  }
  if (a?.pasted?.trim()) {
    rows.push({
      id: `faq_pasted_${tenant.id}`,
      tenantId: tenant.id,
      kind: "faq",
      label: "pasted",
      body: a.pasted.trim(),
      meta: {},
      updatedAt: now,
    });
  }

  return rows;
}

export async function listTenantKnowledge(
  tenantId: string,
): Promise<TenantKnowledgeRow[]> {
  if (!isRemote()) return fileStore.listTenantKnowledge(tenantId);
  const sb = getRemote();
  const { data, error } = await sb
    .from("tenant_knowledge")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    kind: row.kind as KnowledgeKind,
    label: String(row.label),
    body: String(row.body),
    meta: (row.meta as Record<string, unknown>) ?? {},
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  }));
}

export async function upsertTenantKnowledge(
  row: Omit<TenantKnowledgeRow, "updatedAt"> & { updatedAt?: string },
): Promise<TenantKnowledgeRow> {
  const full: TenantKnowledgeRow = {
    ...row,
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
  if (!isRemote()) return fileStore.upsertTenantKnowledge(full);
  const sb = getRemote();
  const { data, error } = await sb
    .from("tenant_knowledge")
    .upsert(
      {
        id: full.id,
        tenant_id: full.tenantId,
        kind: full.kind,
        label: full.label,
        body: full.body,
        meta: full.meta,
        updated_at: full.updatedAt,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  const saved = data as Record<string, unknown>;
  return {
    id: String(saved.id),
    tenantId: String(saved.tenant_id),
    kind: saved.kind as KnowledgeKind,
    label: String(saved.label),
    body: String(saved.body),
    meta: (saved.meta as Record<string, unknown>) ?? {},
    updatedAt: String(saved.updated_at),
  };
}

/** Ensure pricing + bot.answers (+ trades pack FAQ) are mirrored into tenant_knowledge. */
export async function seedKnowledgeFromTenant(
  tenant: Tenant,
  tradeKind?: string | null,
): Promise<TenantKnowledgeRow[]> {
  const rows = knowledgeFromTenant(tenant);
  if (tenant.vertical === "trades") {
    const { tradesKnowledgeRows } = await import("@/lib/trades/pack");
    rows.push(...tradesKnowledgeRows(tenant.id, tradeKind));
  }
  const saved: TenantKnowledgeRow[] = [];
  for (const row of rows) {
    saved.push(await upsertTenantKnowledge(row));
  }
  return saved;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

/**
 * Keyword retrieval by kind. `pricing_items` (via kind=price) is the only
 * allowed price source — never synthesize amounts here.
 */
export function retrieveGroundings(input: {
  query: string;
  rows: TenantKnowledgeRow[];
  kinds?: KnowledgeKind[];
  limit?: number;
}): Grounding[] {
  const kinds = input.kinds;
  const tokens = tokenize(input.query);
  const scored = input.rows
    .filter((row) => !kinds || kinds.includes(row.kind))
    .map((row) => {
      const hay = `${row.label} ${row.body}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }
      if (row.kind === "price" || row.kind === "hours" || row.kind === "area") {
        score += 0.25;
      }
      return { row, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 5);

  return scored.map(({ row }) => ({
    source: `${row.kind}:${row.label}`,
    text: row.body,
  }));
}

/** Lookup an exact priced service by name/fuzzy token match — never invent. */
export function findPricedService(
  query: string,
  tenant: Tenant,
): { name: string; priceIls: number; grounding: Grounding } | null {
  const q = query.toLowerCase();
  const tokens = tokenize(query);
  let best: { name: string; priceIls: number; score: number } | null = null;

  for (const item of tenant.pricing ?? []) {
    const name = item.name.toLowerCase();
    let score = 0;
    if (q.includes(name) || name.includes(q.trim())) score += 5;
    for (const t of tokens) {
      if (name.includes(t)) score += 2;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { name: item.name, priceIls: item.priceIls, score };
    }
  }

  if (!best || best.score < 2) return null;
  return {
    name: best.name,
    priceIls: best.priceIls,
    grounding: {
      source: `pricing_items:${best.name}`,
      text: `${best.name}: ₪${best.priceIls}`,
    },
  };
}

export function newKnowledgeId(prefix = "kn"): string {
  return `${prefix}_${nanoid(10)}`;
}
