import { MessageTemplate, Tenant } from "@/lib/types";
import {
  getTenantById,
  listTemplatesForTenant,
  upsertTemplate,
} from "@/lib/store/db";
import { HEBREW_UTILITY_SEEDS } from "@/lib/templates/seeds";
import {
  graphCreateTemplate,
  graphRefreshTemplate,
} from "@/lib/templates/meta-graph";
import { bustReadinessCache } from "@/lib/product/readiness";

export async function listTemplates(tenantId: string): Promise<MessageTemplate[]> {
  return listTemplatesForTenant(tenantId);
}

export async function seedAndSubmitUtilities(
  tenantId: string,
): Promise<MessageTemplate[]> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");
  const out: MessageTemplate[] = [];
  for (const seed of HEBREW_UTILITY_SEEDS) {
    out.push(await submitTemplate(tenant, seed.name));
  }
  bustReadinessCache(tenantId);
  return out;
}

export async function submitTemplate(
  tenant: Tenant,
  name: string,
): Promise<MessageTemplate> {
  const seed = HEBREW_UTILITY_SEEDS.find((s) => s.name === name);
  if (!seed) throw new Error(`unknown_template:${name}`);

  const existing = (await listTemplatesForTenant(tenant.id)).find(
    (t) => t.name === seed.name && t.language === seed.language,
  );
  if (existing?.status === "approved") return existing;

  const created = await graphCreateTemplate({
    tenant,
    name: seed.name,
    language: seed.language,
    category: seed.category,
    components: [...seed.components],
  });

  const now = new Date().toISOString();
  const row = await upsertTemplate({
    id: existing?.id,
    tenantId: tenant.id,
    name: seed.name,
    language: seed.language,
    category: seed.category,
    components: [...seed.components],
    status: created.status,
    metaId: created.metaId,
    rejectionReason: created.rejectionReason,
    submittedAt: now,
    approvedAt: created.status === "approved" ? now : undefined,
  });
  bustReadinessCache(tenant.id);
  return row;
}

export async function refreshPendingTemplates(
  tenantId: string,
): Promise<MessageTemplate[]> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");
  const templates = await listTemplatesForTenant(tenantId);
  const out: MessageTemplate[] = [];
  for (const tpl of templates) {
    if (tpl.status !== "pending" || !tpl.metaId) {
      out.push(tpl);
      continue;
    }
    const refreshed = await graphRefreshTemplate({
      tenant,
      metaId: tpl.metaId,
    });
    const now = new Date().toISOString();
    out.push(
      await upsertTemplate({
        id: tpl.id,
        tenantId: tenant.id,
        name: tpl.name,
        language: tpl.language,
        category: tpl.category,
        components: tpl.components,
        status: refreshed.status,
        metaId: refreshed.metaId,
        rejectionReason: refreshed.rejectionReason,
        submittedAt: tpl.submittedAt,
        approvedAt: refreshed.status === "approved" ? now : tpl.approvedAt,
      }),
    );
  }
  bustReadinessCache(tenantId);
  return out;
}

export async function findApprovedTemplate(
  tenantId: string,
  name: string,
): Promise<MessageTemplate | null> {
  const templates = await listTemplatesForTenant(tenantId);
  return (
    templates.find(
      (t) => t.name === name && t.language === "he" && t.status === "approved",
    ) ?? null
  );
}
