import { Tenant } from "@/lib/types";
import { getWhatsAppToken } from "@/lib/whatsapp/client";
import { providerMode } from "@/lib/product/readiness";
import { META_GRAPH_BASE } from "@/lib/whatsapp/graph";

const GRAPH = META_GRAPH_BASE;

export type GraphTemplateCreateResult = {
  metaId: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
};

export type GraphTemplateStatus = {
  metaId: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
};

/** Demo Graph — no network. Live uses WABA message_templates. */
export async function graphCreateTemplate(input: {
  tenant: Tenant;
  name: string;
  language: string;
  category: string;
  components: unknown[];
}): Promise<GraphTemplateCreateResult> {
  if (
    providerMode() !== "live" ||
    process.env.META_TEMPLATE_SUBMIT_ENABLED !== "1"
  ) {
    return {
      metaId: `demo_tpl_${input.name}_${Date.now()}`,
      status: "pending",
    };
  }

  const token = getWhatsAppToken(input.tenant);
  const wabaId = input.tenant.whatsapp.wabaId;
  if (!token || !wabaId) throw new Error("meta_template_credentials_missing");

  const res = await fetch(`${GRAPH}/${wabaId}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      language: input.language,
      category: input.category,
      components: input.components,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`meta_template_create_failed:${err}`);
  }
  const data = (await res.json()) as {
    id?: string;
    status?: string;
  };
  return {
    metaId: data.id ?? `meta_${input.name}`,
    status: mapStatus(data.status),
  };
}

export async function graphRefreshTemplate(input: {
  tenant: Tenant;
  metaId: string;
}): Promise<GraphTemplateStatus> {
  if (
    providerMode() !== "live" ||
    process.env.META_TEMPLATE_SUBMIT_ENABLED !== "1"
  ) {
    // Demo refresh: pending → approved unless name contains reject fixture.
    if (input.metaId.includes("reject")) {
      return {
        metaId: input.metaId,
        status: "rejected",
        rejectionReason: "DEMO_REJECTED",
      };
    }
    return { metaId: input.metaId, status: "approved" };
  }

  const token = getWhatsAppToken(input.tenant);
  if (!token) throw new Error("meta_template_credentials_missing");
  const res = await fetch(
    `${GRAPH}/${input.metaId}?fields=name,status,rejected_reason`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`meta_template_refresh_failed:${res.status}`);
  }
  const data = (await res.json()) as {
    id?: string;
    status?: string;
    rejected_reason?: string;
  };
  return {
    metaId: data.id ?? input.metaId,
    status: mapStatus(data.status),
    rejectionReason: data.rejected_reason,
  };
}

function mapStatus(
  raw: string | undefined,
): "pending" | "approved" | "rejected" {
  const s = (raw ?? "PENDING").toUpperCase();
  if (s.includes("APPROV") || s === "ACTIVE") return "approved";
  if (s.includes("REJECT") || s.includes("DISABL")) return "rejected";
  return "pending";
}
