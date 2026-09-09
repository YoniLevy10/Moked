import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperadminContext } from "@/lib/auth/tenant-context";
import {
  createProspect,
  deleteProspect,
  listProspects,
  updateProspect,
} from "@/lib/store/db";
import {
  OUTREACH_TEMPLATES,
  ProspectStatusSchema,
  ProspectVerticalSchema,
  aggregateProspectFunnel,
  buildWaMeLink,
  renderOutreachTemplate,
} from "@/lib/prospects";

export async function GET() {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;
  const prospects = await listProspects();
  return NextResponse.json({
    prospects,
    funnel: aggregateProspectFunnel(prospects),
    templates: OUTREACH_TEMPLATES,
  });
}

const CreateSchema = z.object({
  businessName: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().min(9),
  vertical: ProspectVerticalSchema.default("other"),
  source: z.string().default("manual"),
  notes: z.string().default(""),
  status: ProspectStatusSchema.default("new"),
});

const BulkSchema = z.object({
  /** Lines: businessName | phone | contactName? | vertical? | source? */
  lines: z.string().min(1),
  defaultVertical: ProspectVerticalSchema.default("trades"),
  defaultSource: z.string().default("bulk"),
});

export async function POST(req: NextRequest) {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;

  const json = await req.json();
  if (json?.action === "bulk") {
    const body = BulkSchema.parse(json);
    const created = [];
    for (const raw of body.lines.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const parts = line.split(/[|\t,]/).map((p: string) => p.trim());
      const [businessName, phone, contactName, vertical, source] = parts;
      if (!businessName || !phone) continue;
      const vertParsed = ProspectVerticalSchema.safeParse(vertical);
      created.push(
        await createProspect({
          businessName,
          phone,
          contactName: contactName || undefined,
          vertical: vertParsed.success ? vertParsed.data : body.defaultVertical,
          source: source || body.defaultSource,
          status: "new",
          notes: "",
        }),
      );
    }
    return NextResponse.json({ created, count: created.length }, { status: 201 });
  }

  const body = CreateSchema.parse(json);
  const prospect = await createProspect({
    businessName: body.businessName,
    contactName: body.contactName,
    phone: body.phone,
    vertical: body.vertical,
    source: body.source,
    notes: body.notes,
    status: body.status,
  });
  return NextResponse.json({ prospect }, { status: 201 });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["update", "prepare_outreach", "mark_contacted"]).default("update"),
  businessName: z.string().min(1).optional(),
  contactName: z.string().optional(),
  phone: z.string().min(9).optional(),
  vertical: ProspectVerticalSchema.optional(),
  source: z.string().optional(),
  status: ProspectStatusSchema.optional(),
  notes: z.string().optional(),
  interestScore: z.number().min(0).max(5).optional(),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;
  const body = PatchSchema.parse(await req.json());

  if (body.action === "prepare_outreach" || body.action === "mark_contacted") {
    const prospects = await listProspects();
    const current = prospects.find((p) => p.id === body.id);
    if (!current) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const template =
      OUTREACH_TEMPLATES.find((t) => t.id === body.templateId) ??
      OUTREACH_TEMPLATES[0];
    const message =
      body.customMessage?.trim() ||
      renderOutreachTemplate(template.body, current);
    const waLink = buildWaMeLink(current.phone, message);

    const nextStatus =
      body.action === "mark_contacted" || current.status === "new"
        ? ("contacted" as const)
        : current.status;

    const prospect = await updateProspect(body.id, {
      status: nextStatus,
      lastOutreachAt: new Date().toISOString(),
      lastOutreachChannel: "wa_link",
    });

    return NextResponse.json({
      prospect,
      waLink,
      message,
      templateId: template.id,
    });
  }

  const prospect = await updateProspect(body.id, {
    businessName: body.businessName,
    contactName: body.contactName,
    phone: body.phone,
    vertical: body.vertical,
    source: body.source,
    status: body.status,
    notes: body.notes,
    interestScore: body.interestScore,
  });
  return NextResponse.json({ prospect });
}

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const ctx = await requireSuperadminContext();
  if (!ctx.ok) return ctx.response;
  const body = DeleteSchema.parse(await req.json());
  await deleteProspect(body.id);
  return NextResponse.json({ ok: true });
}
