import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenant, listMessages } from "@/lib/store/db";
import { handleInboundMessage } from "@/lib/processes/engine";

const Schema = z.object({
  from: z.string().default("972501111111"),
  name: z.string().default("רונית לוי"),
  /** If true, runs the canonical Wave A script end-to-end. */
  script: z.boolean().default(true),
  texts: z.array(z.string()).optional(),
});

const WAVE_A_SCRIPT = [
  "יש נזילה במטבח. אפשר להגיע היום?",
  "היום אחה״צ",
  "ירושלים",
  "יש גישה לחניה מאחורי הבניין",
  "1",
  "רמב״ן 14, ירושלים",
];

/**
 * Runs a full Wave A conversation (Intake → Qualification → Booking+address).
 * Useful for demos and smoke checks without Meta.
 */
export async function POST(req: NextRequest) {
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }
  if (!tenant.whatsapp.connected) {
    return NextResponse.json(
      { error: "whatsapp_not_connected" },
      { status: 400 },
    );
  }

  const body = Schema.parse(await req.json().catch(() => ({})));
  const texts = body.script ? WAVE_A_SCRIPT : (body.texts ?? WAVE_A_SCRIPT);

  const steps: Array<{
    inbound: string;
    replies: string[];
    activeProcess?: string;
    events?: string[];
    leadScore?: number;
  }> = [];

  let conversationId = "";
  let finalState: Record<string, unknown> = {};

  for (const text of texts) {
    const result = await handleInboundMessage({
      tenant,
      customerWaId: body.from,
      customerName: body.name,
      text,
    });
    conversationId = result.conversation.id;
    finalState = result.conversation.processState ?? {};
    steps.push({
      inbound: text,
      replies: result.result.replies.map((r) => r.body),
      activeProcess: result.conversation.activeProcess,
      events: result.result.events,
      leadScore: result.conversation.leadScore,
    });
  }

  const messages = await listMessages(conversationId);

  return NextResponse.json({
    ok: true,
    wave: "A",
    conversationId,
    waveADone: Boolean(finalState.waveADone),
    address: finalState.address,
    preferTime: finalState.preferTime,
    steps,
    messageCount: messages.length,
  });
}
