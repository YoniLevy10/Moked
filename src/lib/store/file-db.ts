import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import {
  Conversation,
  Message,
  PROCESS_CATALOG,
  ProcessKey,
  Tenant,
  VERTICALS,
} from "@/lib/types";
import { BusinessEvent } from "@/lib/outcomes";
import { Prospect } from "@/lib/prospects";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export type DbShape = {
  tenants: Tenant[];
  conversations: Conversation[];
  messages: Message[];
  businessEvents: BusinessEvent[];
  prospects: Prospect[];
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
      businessEvents: parsed.businessEvents ?? [],
      prospects: parsed.prospects ?? [],
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
}): Promise<Tenant> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  const tenant: Tenant = {
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
  };
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
  db.tenants[idx] = { ...db.tenants[idx], ...patch };
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
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return db.conversations[idx];
}

export async function addMessage(
  input: Omit<Message, "id" | "createdAt">,
): Promise<Message> {
  const db = await ensureDb();
  const message: Message = {
    ...input,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  await writeDb(db);
  return message;
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

export function greetingFor(tenant: Tenant): string {
  return VERTICALS[tenant.vertical].defaultGreeting;
}
