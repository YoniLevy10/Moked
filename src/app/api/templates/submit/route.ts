import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { submitTemplate } from "@/lib/templates/service";

const Body = z.object({
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const template = await submitTemplate(ctx.tenant, parsed.data.name);
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "submit_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
