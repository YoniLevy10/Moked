/**
 * In-memory MVP store. Later: Supabase/Postgres.
 */

const globalStore = globalThis.__mokedStore ?? {
  businesses: new Map(),
  sessions: new Map(),
  events: [],
  approvals: new Map(),
  messages: [], // simulation inbox per phone
};

globalThis.__mokedStore = globalStore;

function id(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createBusiness({ name, field, phone }) {
  const business = {
    id: id("biz"),
    name: name || "עסק לדוגמה",
    field: field || "שירותים",
    phone: phone || null,
    createdAt: new Date().toISOString(),
    planPriceIls: 690,
  };
  globalStore.businesses.set(business.id, business);
  return business;
}

export function listBusinesses() {
  return [...globalStore.businesses.values()];
}

export function getBusiness(businessId) {
  return globalStore.businesses.get(businessId) || null;
}

export function getOrCreateSession({ businessId, contactPhone, workflow }) {
  const key = `${businessId}:${contactPhone}:${workflow}`;
  let session = globalStore.sessions.get(key);
  if (!session) {
    session = {
      id: id("ses"),
      key,
      businessId,
      contactPhone,
      workflow,
      status: "open",
      step: "start",
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalStore.sessions.set(key, session);
  }
  return session;
}

export function getSessionById(sessionId) {
  for (const s of globalStore.sessions.values()) {
    if (s.id === sessionId) return s;
  }
  return null;
}

export function listSessions(businessId) {
  return [...globalStore.sessions.values()].filter((s) =>
    businessId ? s.businessId === businessId : true
  );
}

export function updateSession(session, patch) {
  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  globalStore.sessions.set(session.key, session);
  return session;
}

export function addEvent(event) {
  const row = {
    id: id("evt"),
    at: new Date().toISOString(),
    ...event,
  };
  globalStore.events.unshift(row);
  globalStore.events = globalStore.events.slice(0, 200);
  return row;
}

export function listEvents(limit = 50) {
  return globalStore.events.slice(0, limit);
}

export function createApproval({ sessionId, businessId, type, title, payload }) {
  const approval = {
    id: id("apr"),
    sessionId,
    businessId,
    type,
    title,
    payload: payload || {},
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  globalStore.approvals.set(approval.id, approval);
  addEvent({
    type: "approval.created",
    businessId,
    sessionId,
    approvalId: approval.id,
    title,
  });
  return approval;
}

export function listApprovals(businessId) {
  return [...globalStore.approvals.values()].filter((a) =>
    businessId ? a.businessId === businessId : true
  );
}

export function getApproval(approvalId) {
  return globalStore.approvals.get(approvalId) || null;
}

export function resolveApproval(approvalId, decision) {
  const approval = globalStore.approvals.get(approvalId);
  if (!approval) return null;
  approval.status = decision; // approved | rejected
  approval.resolvedAt = new Date().toISOString();
  addEvent({
    type: "approval.resolved",
    businessId: approval.businessId,
    sessionId: approval.sessionId,
    approvalId,
    decision,
  });
  return approval;
}

export function pushMessage({ businessId, contactPhone, direction, text, buttons }) {
  const msg = {
    id: id("msg"),
    businessId,
    contactPhone,
    direction, // inbound | outbound
    text,
    buttons: buttons || null,
    at: new Date().toISOString(),
  };
  globalStore.messages.push(msg);
  return msg;
}

export function listMessages({ businessId, contactPhone } = {}) {
  return globalStore.messages.filter((m) => {
    if (businessId && m.businessId !== businessId) return false;
    if (contactPhone && m.contactPhone !== contactPhone) return false;
    return true;
  });
}

export function snapshot() {
  return {
    businesses: listBusinesses(),
    sessions: listSessions(),
    events: listEvents(30),
    approvals: listApprovals(),
    messages: listMessages(),
  };
}

export function resetStore() {
  globalStore.businesses.clear();
  globalStore.sessions.clear();
  globalStore.events = [];
  globalStore.approvals.clear();
  globalStore.messages = [];
}
