import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/store/db";
import { triggerReminder, triggerRetention } from "@/lib/processes/engine";

const HOUR = 60 * 60 * 1000;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Sends due T-24 / T-2 reminders and a post-visit review request. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const now = Date.now();
  let reminders = 0;
  let retention = 0;

  for (const conversation of db.conversations) {
    if (conversation.status !== "open") continue;
    const start = Date.parse(
      conversation.booking?.startsAt ??
        (typeof conversation.processState?.startsAt === "string"
          ? conversation.processState.startsAt
          : ""),
    );
    if (Number.isNaN(start)) continue;
    const tenant = db.tenants.find((item) => item.id === conversation.tenantId);
    if (!tenant) continue;
    const delta = start - now;
    const state = conversation.processState ?? {};

    if (
      tenant.processes.reminders?.enabled &&
      !conversation.booking?.reminder24Sent &&
      delta <= 24 * HOUR &&
      delta > 2 * HOUR
    ) {
      await triggerReminder({ tenant, conversation, kind: "t24" });
      reminders += 1;
      continue;
    }

    if (
      tenant.processes.reminders?.enabled &&
      !conversation.booking?.reminder2Sent &&
      delta <= 2 * HOUR &&
      delta > 0
    ) {
      await triggerReminder({ tenant, conversation, kind: "t2" });
      reminders += 1;
      continue;
    }

    if (
      tenant.processes.retention?.enabled &&
      state.bookingConfirmed === true &&
      state.retentionSent !== true &&
      now >= start + 3 * HOUR
    ) {
      await triggerRetention({ tenant, conversation });
      retention += 1;
    }
  }

  return NextResponse.json({ ok: true, reminders, retention });
}
