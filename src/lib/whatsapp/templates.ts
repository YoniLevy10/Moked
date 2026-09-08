import { GRAPH, getWhatsAppToken } from "@/lib/whatsapp/client";
import { HE_TEMPLATES, type HeTemplateKey } from "@/lib/whatsapp/he-templates";
import { Tenant } from "@/lib/types";

type GraphTemplate = {
  id?: string;
  name: string;
  status?: string;
  category?: string;
  language?: string;
};

export async function listMessageTemplates(
  tenant: Tenant,
): Promise<GraphTemplate[]> {
  const token = getWhatsAppToken(tenant);
  const wabaId = tenant.whatsapp.wabaId;
  if (!token || !wabaId) return [];
  const res = await fetch(
    `${GRAPH}/${wabaId}/message_templates?limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: GraphTemplate[] };
  return data.data ?? [];
}

export async function submitHeTemplate(
  tenant: Tenant,
  key: HeTemplateKey,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const token = getWhatsAppToken(tenant);
  const wabaId = tenant.whatsapp.wabaId;
  if (!token || !wabaId) return { ok: false, error: "missing_waba_or_token" };

  const tpl = HE_TEMPLATES[key];
  const components: Array<Record<string, unknown>> = [
    {
      type: "BODY",
      text: tpl.body,
    },
  ];
  if ("buttons" in tpl && tpl.buttons) {
    components.push({
      type: "BUTTONS",
      buttons: tpl.buttons.map((text) => ({
        type: "QUICK_REPLY",
        text,
      })),
    });
  }

  const res = await fetch(`${GRAPH}/${wabaId}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: tpl.name,
      category: tpl.category,
      language: tpl.language,
      components,
      allow_category_change: true,
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}

export async function ensureCoreHeTemplates(tenant: Tenant) {
  const existing = await listMessageTemplates(tenant);
  const names = new Set(existing.map((t) => t.name));
  const results: Array<{ key: HeTemplateKey; ok: boolean; error?: string }> =
    [];
  for (const key of Object.keys(HE_TEMPLATES) as HeTemplateKey[]) {
    if (names.has(HE_TEMPLATES[key].name)) {
      results.push({ key, ok: true });
      continue;
    }
    const res = await submitHeTemplate(tenant, key);
    results.push({ key, ok: res.ok, error: res.error });
  }
  return { existing, results };
}
