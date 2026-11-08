import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import {
  Conversation,
  Message,
  MessageTemplate,
  PhoneNumber,
  PROCESS_CATALOG,
  ProcessKey,
  Tenant,
  VERTICALS,
} from "@/lib/types";
import { defaultBot, defaultSubscription, normalizeTenant } from "@/lib/product/model";
import { defaultAvailability } from "@/lib/types";
import { BusinessEvent } from "@/lib/outcomes";
import { Prospect } from "@/lib/prospects";
import type { TenantKnowledgeRow } from "@/lib/agent/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export type WebhookEventRow = {
  id: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
  processedAt: string;
};

export type DbShape = {
  tenants: Tenant[];
  conversations: Conversation[];
  messages: Message[];
  businessEvents: BusinessEvent[];
  prospects: Prospect[];
  phoneNumbers: PhoneNumber[];
  tenantKnowledge: TenantKnowledgeRow[];
  webhookEvents: WebhookEventRow[];
  templates: MessageTemplate[];
  activeTenantId: string | null;
};

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

function emptyDb(): DbShape {
  return {
    tenants: [],
    conversations: [],
    messages: [],
    businessEvents: [],
    prospects: [],
    phoneNumbers: [],
    tenantKnowledge: [],
    webhookEvents: [],
    templates: [],
    activeTenantId: null,
  };
}

async function ensureDb(): Promise<DbShape> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      ...emptyDb(),
      ...parsed,
      tenants: (parsed.tenants ?? []).map((tenant) => normalizeTenant(tenant as Tenant)),
      businessEvents: parsed.businessEvents ?? [],
      prospects: parsed.prospects ?? [],
      phoneNumbers: parsed.phoneNumbers ?? [],
      tenantKnowledge: parsed.tenantKnowledge ?? [],
      webhookEvents: parsed.webhookEvents ?? [],
      templates: parsed.templates ?? [],
    };
  } catch {
    const db = emptyDb();
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
}

async function writeDb(db: DbShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export async function getDb(): Promise<DbShape> {
  return ensureDb();
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const db = await ensureDb();
  return db.tenants.find((t) => t.id === id) ?? null;
}

export async function getActiveTenant(): Promise<Tenant | null> {
  const db = await ensureDb();
  if (!db.activeTenantId) return db.tenants[0] ?? null;
  return db.tenants.find((t) => t.id === db.activeTenantId) ?? null;
}

export async function setActiveTenantId(tenantId: string): Promise<Tenant> {
  const db = await ensureDb();
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  db.activeTenantId = tenantId;
  await writeDb(db);
  return tenant;
}

export async function createTenant(input: {
  businessName: string;
  ownerName: string;
  phone: string;
  vertical: Tenant["vertical"];
  tradeKind?: string;
}): Promise<Tenant> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  let tenant: Tenant = {
    id: nanoid(),
    businessName: input.businessName,
    ownerName: input.ownerName,
    phone: input.phone,
    vertical: input.vertical,
    locale: "he-IL",
    createdAt: now,
    whatsapp: { connected: false, mode: "demo" },
    processes: defaultProcesses(),
    integrations: {
      googleCalendar: false,
      paymentsProvider: "none",
      invoicingProvider: "none",
    },
    availability: defaultAvailability(),
    pricing: [
      {
        id: nanoid(8),
        name: "פגישת ייעוץ",
        priceIls: 250,
        description: "פגישה ראשונית",
      },
      {
        id: nanoid(8),
        name: "חבילת שירות",
        priceIls: 900,
        description: "חבילה בסיסית",
      },
    ],
    subscription: defaultSubscription(),
    bot: defaultBot(),
  };
  const { applyPackToTenant } = await import("@/lib/verticals/registry");
  const niche =
    input.tradeKind ??
    (input.vertical === "beauty" || input.vertical === "coach"
      ? input.vertical
      : undefined);
  tenant = applyPackToTenant(tenant, input.vertical, { niche });
  db.tenants.push(tenant);
  db.activeTenantId = tenant.id;
  await writeDb(db);
  return tenant;
}

export async function updateTenant(
  tenantId: string,
  patch: Partial<Tenant>,
): Promise<Tenant> {
  const db = await ensureDb();
  const idx = db.tenants.findIndex((t) => t.id === tenantId);
  if (idx < 0) throw new Error("Tenant not found");
  const current = db.tenants[idx];
  db.tenants[idx] = normalizeTenant({
    ...current,
    ...patch,
    whatsapp: patch.whatsapp ? { ...current.whatsapp, ...patch.whatsapp } : current.whatsapp,
    availability: patch.availability
      ? {
          ...defaultAvailability(),
          ...current.availability,
          ...patch.availability,
          windows: patch.availability.windows ?? current.availability?.windows ?? [],
        }
      : current.availability ?? defaultAvailability(),
    subscription: patch.subscription
      ? { ...current.subscription, ...patch.subscription }
      : current.subscription,
    bot: patch.bot
      ? {
          ...current.bot,
          ...patch.bot,
          answers: { ...current.bot.answers, ...(patch.bot.answers ?? {}) },
        }
      : current.bot,
  });
  await writeDb(db);
  return db.tenants[idx];
}

export async function setProcessEnabled(
  tenantId: string,
  key: ProcessKey,
  enabled: boolean,
): Promise<Tenant> {
  const db = await ensureDb();
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!tenant) throw new Error("Tenant not found");
  tenant.processes[key] = {
    ...tenant.processes[key],
    enabled,
  };
  await writeDb(db);
  return tenant;
}

export async function connectWhatsAppDemo(tenantId: string): Promise<Tenant> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");
  return updateTenant(tenantId, {
    whatsapp: {
      connected: true,
      mode: "demo",
      displayPhone: "+972500000000",
      phoneNumberId: `demo_${tenantId}`,
      wabaId: `demo_waba_${tenantId}`,
      connectedAt: new Date().toISOString(),
    },
    subscription: {
      ...tenant.subscription,
      status: "active",
      provider: "demo",
      externalId: tenant.subscription.externalId ?? `demo_sub_${tenantId}`,
    },
    bot: {
      ...tenant.bot,
      approved:
        tenant.bot.approved ??
        "מענה בעברית, קביעת תורים, והעברה לאדם כשמבקשים.",
      approvedAt: tenant.bot.approvedAt ?? new Date().toISOString(),
    },
  });
}

export async function listTemplatesForTenant(
  tenantId: string,
): Promise<MessageTemplate[]> {
  const db = await ensureDb();
  return db.templates.filter((t) => t.tenantId === tenantId);
}

export async function upsertTemplate(input: {
  id?: string;
  tenantId: string;
  name: string;
  language: string;
  category: string;
  components: unknown[];
  status: MessageTemplate["status"];
  metaId?: string;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
}): Promise<MessageTemplate> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const idx = db.templates.findIndex(
    (t) =>
      (input.id && t.id === input.id) ||
      (t.tenantId === input.tenantId &&
        t.name === input.name &&
        t.language === input.language),
  );
  if (idx >= 0) {
    db.templates[idx] = {
      ...db.templates[idx],
      ...input,
      metaId: input.metaId ?? db.templates[idx].metaId,
      rejectionReason: input.rejectionReason,
      submittedAt: input.submittedAt ?? db.templates[idx].submittedAt,
      approvedAt: input.approvedAt ?? db.templates[idx].approvedAt,
      updatedAt: now,
    };
    await writeDb(db);
    return db.templates[idx];
  }
  const row: MessageTemplate = {
    id: input.id ?? nanoid(),
    tenantId: input.tenantId,
    name: input.name,
    language: input.language,
    category: input.category,
    components: input.components,
    status: input.status,
    metaId: input.metaId,
    rejectionReason: input.rejectionReason,
    submittedAt: input.submittedAt,
    approvedAt: input.approvedAt,
    createdAt: now,
    updatedAt: now,
  };
  db.templates.push(row);
  await writeDb(db);
  return row;
}

export async function applyTemplateStatusUpdate(input: {
  tenantId: string;
  metaId?: string;
  name?: string;
  language?: string;
  event?: string;
  reason?: string;
}): Promise<MessageTemplate> {
  const db = await ensureDb();
  const language = input.language ?? "he";
  const name = input.name ?? `template_${input.metaId ?? "unknown"}`;
  const event = (input.event ?? "").toLowerCase();
  const rejected =
    event.includes("reject") ||
    event.includes("disabl") ||
    event === "rejected";
  const approved =
    event.includes("approv") || event === "approved" || event === "active";
  const status: MessageTemplate["status"] = rejected
    ? "rejected"
    : approved
      ? "approved"
      : "pending";
  const now = new Date().toISOString();

  const idx = db.templates.findIndex(
    (t) =>
      t.tenantId === input.tenantId &&
      ((input.metaId && t.metaId === input.metaId) ||
        (t.name === name && t.language === language)),
  );

  if (idx >= 0) {
    db.templates[idx] = {
      ...db.templates[idx],
      status,
      metaId: input.metaId ?? db.templates[idx].metaId,
      rejectionReason: rejected
        ? (input.reason ?? db.templates[idx].rejectionReason)
        : undefined,
      approvedAt: approved ? now : db.templates[idx].approvedAt,
      updatedAt: now,
    };
    await writeDb(db);
    return db.templates[idx];
  }

  const row: MessageTemplate = {
    id: nanoid(),
    tenantId: input.tenantId,
    name,
    language,
    category: "UTILITY",
    components: [],
    status,
    metaId: input.metaId,
    rejectionReason: rejected ? input.reason : undefined,
    submittedAt: now,
    approvedAt: approved ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };
  db.templates.push(row);
  await writeDb(db);
  return row;
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
  const db = await ensureDb();
  const existing = db.conversations.find(
    (c) =>
      c.tenantId === input.tenantId &&
      c.customerWaId === input.customerWaId &&
      c.status !== "closed",
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: nanoid(),
    tenantId: input.tenantId,
    customerWaId: input.customerWaId,
    customerName: input.customerName,
    status: "open",
    intent: "unknown",
    processState: {},
    agent: {},
    updatedAt: now,
    createdAt: now,
  };
  db.conversations.unshift(conversation);
  await writeDb(db);
  return conversation;
}

export async function updateConversation(
  conversationId: string,
  patch: Partial<Conversation>,
): Promise<Conversation> {
  const db = await ensureDb();
  const idx = db.conversations.findIndex((c) => c.id === conversationId);
  if (idx < 0) throw new Error("Conversation not found");
  const current = db.conversations[idx];
  db.conversations[idx] = {
    ...current,
    ...patch,
    processState: {
      ...current.processState,
      ...(patch.processState ?? {}),
    },
    booking: patch.booking
      ? { ...current.booking, ...patch.booking }
      : current.booking,
    quote: patch.quote ? { ...current.quote, ...patch.quote } : current.quote,
    payment: patch.payment
      ? { ...current.payment, ...patch.payment }
      : current.payment,
    agent:
      patch.agent !== undefined
        ? { ...(current.agent ?? {}), ...patch.agent }
        : current.agent ?? {},
    escalation:
      patch.escalation !== undefined ? patch.escalation : current.escalation,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return db.conversations[idx];
}

export async function listTenantKnowledge(
  tenantId: string,
): Promise<TenantKnowledgeRow[]> {
  const db = await ensureDb();
  return db.tenantKnowledge.filter((row) => row.tenantId === tenantId);
}

export async function upsertTenantKnowledge(
  row: TenantKnowledgeRow,
): Promise<TenantKnowledgeRow> {
  const db = await ensureDb();
  const idx = db.tenantKnowledge.findIndex((r) => r.id === row.id);
  if (idx >= 0) {
    const existing = db.tenantKnowledge[idx];
    if (existing.tenantId !== row.tenantId) {
      throw new Error("cross_tenant_knowledge");
    }
    db.tenantKnowledge[idx] = row;
  } else {
    db.tenantKnowledge.push(row);
  }
  await writeDb(db);
  return row;
}

export async function deleteTenantKnowledge(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const db = await ensureDb();
  const before = db.tenantKnowledge.length;
  db.tenantKnowledge = db.tenantKnowledge.filter(
    (row) => !(row.id === id && row.tenantId === tenantId),
  );
  if (db.tenantKnowledge.length === before) return false;
  await writeDb(db);
  return true;
}

export async function addMessage(
  input: Omit<Message, "id" | "createdAt">,
): Promise<Message> {
  const db = await ensureDb();
  if (
    input.metaMessageId &&
    db.messages.some((m) => m.metaMessageId === input.metaMessageId)
  ) {
    throw new Error("duplicate_meta_message_id");
  }
  const message: Message = {
    ...input,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  await writeDb(db);
  return message;
}

export async function getTenantBySubscriptionExternalId(
  externalId: string,
): Promise<Tenant | null> {
  const db = await ensureDb();
  return (
    db.tenants.find((t) => t.subscription.externalId === externalId) ?? null
  );
}

export async function getConversationByPaymentExternalId(
  externalId: string,
): Promise<Conversation | null> {
  const db = await ensureDb();
  return (
    db.conversations.find((c) => c.payment?.externalId === externalId) ?? null
  );
}

export async function claimWebhookEvent(input: {
  id: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
}): Promise<boolean> {
  const db = await ensureDb();
  if (db.webhookEvents.some((row) => row.id === input.id)) return false;
  db.webhookEvents.push({
    id: input.id,
    tenantId: input.tenantId,
    payload: input.payload,
    processedAt: new Date().toISOString(),
  });
  await writeDb(db);
  return true;
}

export async function updateMessageDeliveryByMetaId(input: {
  metaMessageId: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorCode?: string;
}): Promise<Message | null> {
  const db = await ensureDb();
  const idx = db.messages.findIndex(
    (m) => m.metaMessageId === input.metaMessageId,
  );
  if (idx < 0) return null;
  const current = db.messages[idx];
  db.messages[idx] = {
    ...current,
    deliveredAt: input.deliveredAt ?? current.deliveredAt,
    readAt: input.readAt ?? current.readAt,
    failedAt: input.failedAt ?? current.failedAt,
    errorCode: input.errorCode ?? current.errorCode,
  };
  await writeDb(db);
  return db.messages[idx];
}

export async function listConversations(tenantId: string): Promise<
  Array<Conversation & { lastMessage?: Message }>
> {
  const db = await ensureDb();
  return db.conversations
    .filter((c) => c.tenantId === tenantId)
    .map((c) => {
      const msgs = db.messages
        .filter((m) => m.conversationId === c.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { ...c, lastMessage: msgs[msgs.length - 1] };
    });
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const db = await ensureDb();
  return db.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addBusinessEvents(
  events: Array<Omit<BusinessEvent, "id" | "createdAt">>,
): Promise<BusinessEvent[]> {
  if (events.length === 0) return [];
  const db = await ensureDb();
  const now = new Date().toISOString();
  const created: BusinessEvent[] = events.map((e) => ({
    ...e,
    id: nanoid(),
    createdAt: now,
  }));
  db.businessEvents.push(...created);
  await writeDb(db);
  return created;
}

export async function listBusinessEvents(
  tenantId: string,
): Promise<BusinessEvent[]> {
  const db = await ensureDb();
  return db.businessEvents
    .filter((e) => e.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listProspects(): Promise<Prospect[]> {
  const db = await ensureDb();
  return [...db.prospects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function createProspect(
  input: Omit<Prospect, "id" | "createdAt" | "updatedAt">,
): Promise<Prospect> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const prospect: Prospect = {
    ...input,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };
  db.prospects.unshift(prospect);
  await writeDb(db);
  return prospect;
}

export async function updateProspect(
  id: string,
  patch: Partial<
    Omit<Prospect, "id" | "createdAt" | "updatedAt">
  >,
): Promise<Prospect> {
  const db = await ensureDb();
  const idx = db.prospects.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Prospect not found");
  db.prospects[idx] = {
    ...db.prospects[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return db.prospects[idx];
}

export async function deleteProspect(id: string): Promise<void> {
  const db = await ensureDb();
  db.prospects = db.prospects.filter((p) => p.id !== id);
  await writeDb(db);
}

export async function listPhoneNumbers(): Promise<PhoneNumber[]> {
  const db = await ensureDb();
  return db.phoneNumbers;
}

export async function createPhoneNumber(
  input: Omit<PhoneNumber, "id" | "createdAt" | "updatedAt">,
): Promise<PhoneNumber> {
  const db = await ensureDb();
  if (db.phoneNumbers.some((phone) => phone.e164 === input.e164)) {
    throw new Error("number_already_in_pool");
  }
  const now = new Date().toISOString();
  const phone: PhoneNumber = {
    ...input,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };
  db.phoneNumbers.push(phone);
  await writeDb(db);
  return phone;
}

export async function updatePhoneNumber(
  id: string,
  patch: Partial<PhoneNumber>,
): Promise<PhoneNumber> {
  const db = await ensureDb();
  const idx = db.phoneNumbers.findIndex((phone) => phone.id === id);
  if (idx < 0) throw new Error("number_not_found");
  db.phoneNumbers[idx] = {
    ...db.phoneNumbers[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return db.phoneNumbers[idx];
}

export function greetingFor(tenant: Tenant): string {
  return VERTICALS[tenant.vertical].defaultGreeting;
}
