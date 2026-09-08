import {
  Conversation,
  Message,
  PROCESS_CATALOG,
  ProcessKey,
  Tenant,
  VERTICALS,
} from "@/lib/types";
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/server";
import * as fileStore from "@/lib/store/file-db";

export type DbShape = {
  tenants: Tenant[];
  conversations: Conversation[];
  messages: Message[];
  activeTenantId: string | null;
};

type TenantRow = {
  id: string;
  business_name: string;
  owner_name: string;
  phone: string;
  vertical: Tenant["vertical"];
  locale: string;
  whatsapp_connected: boolean;
  whatsapp_mode: "demo" | "live";
  waba_id: string | null;
  phone_number_id: string | null;
  display_phone: string | null;
  whatsapp_connected_at: string | null;
  google_calendar: boolean;
  payments_provider: Tenant["integrations"]["paymentsProvider"];
  invoicing_provider: Tenant["integrations"]["invoicingProvider"];
  google_reviews_url: string | null;
  created_at: string;
};

type ProcessRow = {
  tenant_id: string;
  process_key: ProcessKey;
  enabled: boolean;
  config: Record<string, unknown>;
};

type PricingRow = {
  id: string;
  tenant_id: string;
  name: string;
  price_ils: number;
  description: string | null;
};

type SecretRow = {
  tenant_id: string;
  whatsapp_access_token: string | null;
};

type ConversationRow = {
  id: string;
  tenant_id: string;
  customer_wa_id: string;
  customer_name: string | null;
  status: Conversation["status"];
  lead_score: number | null;
  intent: Conversation["intent"];
  active_process: ProcessKey | null;
  process_state: Record<string, unknown>;
  booking_proposed_slots: string[];
  booking_confirmed_at: string | null;
  booking_reminder_24_sent: boolean;
  booking_reminder_2_sent: boolean;
  booking_attended: boolean | null;
  booking_address: string | null;
  quote_item_id: string | null;
  quote_amount_ils: number | null;
  quote_status: NonNullable<Conversation["quote"]>["status"] | null;
  payment_link_url: string | null;
  payment_status: NonNullable<Conversation["payment"]>["status"];
  payment_provider: string | null;
  payment_external_id: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: Message["direction"];
  body: string;
  type: Message["type"];
  process_key: ProcessKey | null;
  meta_message_id: string | null;
  created_at: string;
};

function useRemote(): boolean {
  return isSupabaseAdminConfigured();
}

function defaultProcesses(): Tenant["processes"] {
  const processes = {} as Tenant["processes"];
  for (const key of Object.keys(PROCESS_CATALOG) as ProcessKey[]) {
    const meta = PROCESS_CATALOG[key];
    processes[key] = {
      enabled: meta.wave === "A",
      config: {},
    };
  }
  return processes;
}

function mapTenant(
  row: TenantRow,
  processRows: ProcessRow[],
  pricingRows: PricingRow[],
  secret?: SecretRow | null,
): Tenant {
  const processes = defaultProcesses();
  for (const p of processRows) {
    processes[p.process_key] = {
      enabled: p.enabled,
      config: (p.config ?? {}) as Record<string, unknown>,
    };
  }
  return {
    id: row.id,
    businessName: row.business_name,
    ownerName: row.owner_name,
    phone: row.phone,
    vertical: row.vertical,
    locale: "he-IL",
    createdAt: row.created_at,
    whatsapp: {
      connected: row.whatsapp_connected,
      mode: row.whatsapp_mode,
      wabaId: row.waba_id ?? undefined,
      phoneNumberId: row.phone_number_id ?? undefined,
      displayPhone: row.display_phone ?? undefined,
      accessToken: secret?.whatsapp_access_token ?? undefined,
      connectedAt: row.whatsapp_connected_at ?? undefined,
    },
    processes,
    integrations: {
      googleCalendar: row.google_calendar,
      paymentsProvider: row.payments_provider,
      invoicingProvider: row.invoicing_provider,
      googleReviewsUrl: row.google_reviews_url ?? undefined,
    },
    pricing: pricingRows.map((p) => ({
      id: p.id,
      name: p.name,
      priceIls: Number(p.price_ils),
      description: p.description ?? undefined,
    })),
  };
}

function mapConversation(row: ConversationRow): Conversation {
  const hasBooking =
    (row.booking_proposed_slots?.length ?? 0) > 0 ||
    row.booking_confirmed_at ||
    row.booking_reminder_24_sent ||
    row.booking_reminder_2_sent ||
    row.booking_attended != null ||
    row.booking_address;
  const hasQuote =
    row.quote_item_id || row.quote_amount_ils != null || row.quote_status;
  const hasPayment =
    row.payment_link_url ||
    (row.payment_status && row.payment_status !== "none") ||
    row.payment_provider;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerWaId: row.customer_wa_id,
    customerName: row.customer_name ?? undefined,
    status: row.status,
    leadScore: row.lead_score ?? undefined,
    intent: row.intent,
    activeProcess: row.active_process ?? undefined,
    processState: {
      ...(row.process_state ?? {}),
      ...(row.booking_address ? { address: row.booking_address } : {}),
    },
    booking: hasBooking
      ? {
          proposedSlots: row.booking_proposed_slots ?? [],
          confirmedAt: row.booking_confirmed_at ?? undefined,
          reminder24Sent: row.booking_reminder_24_sent,
          reminder2Sent: row.booking_reminder_2_sent,
          attended: row.booking_attended ?? undefined,
        }
      : undefined,
    quote: hasQuote
      ? {
          itemId: row.quote_item_id ?? undefined,
          amountIls:
            row.quote_amount_ils != null
              ? Number(row.quote_amount_ils)
              : undefined,
          status: row.quote_status ?? undefined,
        }
      : undefined,
    payment: hasPayment
      ? {
          linkUrl: row.payment_link_url ?? undefined,
          status: row.payment_status,
          provider: row.payment_provider ?? undefined,
        }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    tenantId: row.tenant_id,
    direction: row.direction,
    body: row.body,
    type: row.type,
    processKey: row.process_key ?? undefined,
    metaMessageId: row.meta_message_id ?? undefined,
    createdAt: row.created_at,
  };
}

async function loadTenantBundle(tenantId: string): Promise<Tenant | null> {
  const sb = getSupabaseAdmin();
  const { data: row, error } = await sb
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const [{ data: processes }, { data: pricing }, { data: secret }] =
    await Promise.all([
      sb.from("tenant_processes").select("*").eq("tenant_id", tenantId),
      sb.from("pricing_items").select("*").eq("tenant_id", tenantId),
      sb
        .from("tenant_secrets")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

  return mapTenant(
    row as TenantRow,
    (processes ?? []) as ProcessRow[],
    (pricing ?? []) as PricingRow[],
    secret as SecretRow | null,
  );
}

async function loadAllTenants(): Promise<Tenant[]> {
  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const [{ data: processes }, { data: pricing }, { data: secrets }] =
    await Promise.all([
      sb.from("tenant_processes").select("*").in("tenant_id", ids),
      sb.from("pricing_items").select("*").in("tenant_id", ids),
      sb.from("tenant_secrets").select("*").in("tenant_id", ids),
    ]);

  const procBy = new Map<string, ProcessRow[]>();
  for (const p of (processes ?? []) as ProcessRow[]) {
    const list = procBy.get(p.tenant_id) ?? [];
    list.push(p);
    procBy.set(p.tenant_id, list);
  }
  const priceBy = new Map<string, PricingRow[]>();
  for (const p of (pricing ?? []) as PricingRow[]) {
    const list = priceBy.get(p.tenant_id) ?? [];
    list.push(p);
    priceBy.set(p.tenant_id, list);
  }
  const secretBy = new Map<string, SecretRow>();
  for (const s of (secrets ?? []) as SecretRow[]) {
    secretBy.set(s.tenant_id, s);
  }

  return (rows as TenantRow[]).map((row) =>
    mapTenant(
      row,
      procBy.get(row.id) ?? [],
      priceBy.get(row.id) ?? [],
      secretBy.get(row.id) ?? null,
    ),
  );
}

export async function getDb(): Promise<DbShape> {
  if (!useRemote()) return fileStore.getDb();
  const sb = getSupabaseAdmin();
  const [tenants, { data: convRows, error: cErr }, { data: msgRows, error: mErr }] =
    await Promise.all([
      loadAllTenants(),
      sb.from("conversations").select("*").order("updated_at", { ascending: false }),
      sb.from("messages").select("*").order("created_at", { ascending: true }),
    ]);
  if (cErr) throw cErr;
  if (mErr) throw mErr;
  return {
    tenants,
    conversations: ((convRows ?? []) as ConversationRow[]).map(mapConversation),
    messages: ((msgRows ?? []) as MessageRow[]).map(mapMessage),
    activeTenantId: tenants[0]?.id ?? null,
  };
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  if (!useRemote()) return fileStore.getTenantById(id);
  return loadTenantBundle(id);
}

export async function getTenantByPhoneNumberId(
  phoneNumberId: string,
): Promise<Tenant | null> {
  if (!useRemote()) {
    const db = await fileStore.getDb();
    return (
      db.tenants.find(
        (t) =>
          t.whatsapp.connected && t.whatsapp.phoneNumberId === phoneNumberId,
      ) ?? null
    );
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("tenants")
    .select("id")
    .eq("phone_number_id", phoneNumberId)
    .eq("whatsapp_connected", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return loadTenantBundle(data.id as string);
}

export async function getConversationById(
  id: string,
): Promise<Conversation | null> {
  if (!useRemote()) {
    const db = await fileStore.getDb();
    return db.conversations.find((c) => c.id === id) ?? null;
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapConversation(data as ConversationRow);
}

export async function getActiveTenant(): Promise<Tenant | null> {
  if (!useRemote()) return fileStore.getActiveTenant();
  const tenants = await loadAllTenants();
  return tenants[0] ?? null;
}

export async function setActiveTenantId(tenantId: string): Promise<Tenant> {
  if (!useRemote()) return fileStore.setActiveTenantId(tenantId);
  const tenant = await loadTenantBundle(tenantId);
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
}

export async function createTenant(input: {
  businessName: string;
  ownerName: string;
  phone: string;
  vertical: Tenant["vertical"];
}): Promise<Tenant> {
  if (!useRemote()) return fileStore.createTenant(input);
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("tenants")
    .insert({
      business_name: input.businessName,
      owner_name: input.ownerName,
      phone: input.phone,
      vertical: input.vertical,
      locale: "he-IL",
    })
    .select("*")
    .single();
  if (error) throw error;
  const tenant = await loadTenantBundle(data.id as string);
  if (!tenant) throw new Error("Tenant create failed");
  return tenant;
}

export async function updateTenant(
  tenantId: string,
  patch: Partial<Tenant>,
): Promise<Tenant> {
  if (!useRemote()) return fileStore.updateTenant(tenantId, patch);
  const sb = getSupabaseAdmin();
  const current = await loadTenantBundle(tenantId);
  if (!current) throw new Error("Tenant not found");

  const next = { ...current, ...patch };
  const whatsapp = patch.whatsapp
    ? { ...current.whatsapp, ...patch.whatsapp }
    : current.whatsapp;
  const integrations = patch.integrations
    ? { ...current.integrations, ...patch.integrations }
    : current.integrations;

  const { error } = await sb
    .from("tenants")
    .update({
      business_name: next.businessName,
      owner_name: next.ownerName,
      phone: next.phone,
      vertical: next.vertical,
      whatsapp_connected: whatsapp.connected,
      whatsapp_mode: whatsapp.mode ?? "demo",
      waba_id: whatsapp.wabaId ?? null,
      phone_number_id: whatsapp.phoneNumberId ?? null,
      display_phone: whatsapp.displayPhone ?? null,
      whatsapp_connected_at: whatsapp.connectedAt ?? null,
      google_calendar: integrations.googleCalendar,
      payments_provider: integrations.paymentsProvider,
      invoicing_provider: integrations.invoicingProvider,
      google_reviews_url: integrations.googleReviewsUrl ?? null,
    })
    .eq("id", tenantId);
  if (error) throw error;

  if (patch.whatsapp?.accessToken !== undefined) {
    const { error: sErr } = await sb.from("tenant_secrets").upsert({
      tenant_id: tenantId,
      whatsapp_access_token: patch.whatsapp.accessToken ?? null,
    });
    if (sErr) throw sErr;
  }

  if (patch.processes) {
    for (const key of Object.keys(patch.processes) as ProcessKey[]) {
      const conf = patch.processes[key];
      if (!conf) continue;
      const { error: pErr } = await sb.from("tenant_processes").upsert({
        tenant_id: tenantId,
        process_key: key,
        enabled: conf.enabled,
        config: conf.config ?? {},
      });
      if (pErr) throw pErr;
    }
  }

  const updated = await loadTenantBundle(tenantId);
  if (!updated) throw new Error("Tenant not found");
  return updated;
}

export async function setProcessEnabled(
  tenantId: string,
  key: ProcessKey,
  enabled: boolean,
): Promise<Tenant> {
  if (!useRemote()) return fileStore.setProcessEnabled(tenantId, key, enabled);
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("tenant_processes").upsert({
    tenant_id: tenantId,
    process_key: key,
    enabled,
    config: {},
  });
  if (error) throw error;
  const tenant = await loadTenantBundle(tenantId);
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
}

export async function connectWhatsAppDemo(tenantId: string): Promise<Tenant> {
  return updateTenant(tenantId, {
    whatsapp: {
      connected: true,
      mode: "demo",
      displayPhone: "+972500000000",
      phoneNumberId: `demo_${tenantId}`,
      wabaId: `demo_waba_${tenantId}`,
      connectedAt: new Date().toISOString(),
    },
  });
}

export async function connectWhatsAppLive(
  tenantId: string,
  input: {
    wabaId: string;
    phoneNumberId: string;
    displayPhone?: string;
    accessToken: string;
  },
): Promise<Tenant> {
  return updateTenant(tenantId, {
    whatsapp: {
      connected: true,
      mode: "live",
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhone: input.displayPhone,
      accessToken: input.accessToken,
      connectedAt: new Date().toISOString(),
    },
  });
}

export async function getOrCreateConversation(input: {
  tenantId: string;
  customerWaId: string;
  customerName?: string;
}): Promise<Conversation> {
  if (!useRemote()) return fileStore.getOrCreateConversation(input);
  const sb = getSupabaseAdmin();
  const { data: existing, error: findErr } = await sb
    .from("conversations")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("customer_wa_id", input.customerWaId)
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return mapConversation(existing as ConversationRow);

  const { data, error } = await sb
    .from("conversations")
    .insert({
      tenant_id: input.tenantId,
      customer_wa_id: input.customerWaId,
      customer_name: input.customerName ?? null,
      status: "open",
      intent: "unknown",
      process_state: {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapConversation(data as ConversationRow);
}

export async function updateConversation(
  conversationId: string,
  patch: Partial<Conversation>,
): Promise<Conversation> {
  if (!useRemote()) return fileStore.updateConversation(conversationId, patch);
  const sb = getSupabaseAdmin();
  const current = await getConversationById(conversationId);
  if (!current) throw new Error("Conversation not found");

  const processState = {
    ...current.processState,
    ...(patch.processState ?? {}),
  };
  const booking = patch.booking
    ? { ...current.booking, ...patch.booking }
    : current.booking;
  const quote = patch.quote ? { ...current.quote, ...patch.quote } : current.quote;
  const payment = patch.payment
    ? { ...current.payment, ...patch.payment }
    : current.payment;

  const addressFromState =
    typeof processState.address === "string" ? processState.address : null;

  const { data, error } = await sb
    .from("conversations")
    .update({
      customer_name:
        patch.customerName !== undefined
          ? patch.customerName
          : current.customerName ?? null,
      status: patch.status ?? current.status,
      lead_score:
        patch.leadScore !== undefined ? patch.leadScore : current.leadScore ?? null,
      intent: patch.intent ?? current.intent,
      active_process:
        patch.activeProcess !== undefined
          ? patch.activeProcess
          : current.activeProcess ?? null,
      process_state: processState,
      booking_proposed_slots: booking?.proposedSlots ?? [],
      booking_confirmed_at: booking?.confirmedAt ?? null,
      booking_reminder_24_sent: booking?.reminder24Sent ?? false,
      booking_reminder_2_sent: booking?.reminder2Sent ?? false,
      booking_attended: booking?.attended ?? null,
      booking_address: addressFromState,
      quote_item_id: quote?.itemId ?? null,
      quote_amount_ils: quote?.amountIls ?? null,
      quote_status: quote?.status ?? null,
      payment_link_url: payment?.linkUrl ?? null,
      payment_status: payment?.status ?? "none",
      payment_provider: payment?.provider ?? null,
    })
    .eq("id", conversationId)
    .select("*")
    .single();
  if (error) throw error;
  return mapConversation(data as ConversationRow);
}

export async function addMessage(
  input: Omit<Message, "id" | "createdAt">,
): Promise<Message> {
  if (!useRemote()) return fileStore.addMessage(input);
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      tenant_id: input.tenantId,
      direction: input.direction,
      body: input.body,
      type: input.type ?? "text",
      process_key: input.processKey ?? null,
      meta_message_id: input.metaMessageId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapMessage(data as MessageRow);
}

export async function listConversations(tenantId: string): Promise<
  Array<Conversation & { lastMessage?: Message }>
> {
  if (!useRemote()) return fileStore.listConversations(tenantId);
  const sb = getSupabaseAdmin();
  const { data: convRows, error } = await sb
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const conversations = ((convRows ?? []) as ConversationRow[]).map(
    mapConversation,
  );
  if (!conversations.length) return [];

  const ids = conversations.map((c) => c.id);
  const { data: msgRows, error: mErr } = await sb
    .from("messages")
    .select("*")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });
  if (mErr) throw mErr;

  const lastByConv = new Map<string, Message>();
  for (const row of (msgRows ?? []) as MessageRow[]) {
    lastByConv.set(row.conversation_id, mapMessage(row));
  }

  return conversations.map((c) => ({
    ...c,
    lastMessage: lastByConv.get(c.id),
  }));
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (!useRemote()) return fileStore.listMessages(conversationId);
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export function greetingFor(tenant: Tenant): string {
  return VERTICALS[tenant.vertical].defaultGreeting;
}
