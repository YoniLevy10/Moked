import { NextResponse } from "next/server";
import { listApprovals, getApproval } from "@/lib/store/memory";
import { handleApprovalDecision } from "@/lib/engine/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId") || undefined;
  return NextResponse.json({
    ok: true,
    approvals: listApprovals(businessId),
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { approvalId, decision, mode } = body;
  if (!approvalId || !["approved", "rejected"].includes(decision)) {
    return NextResponse.json(
      { ok: false, error: "approvalId and decision (approved|rejected) required" },
      { status: 400 }
    );
  }
  if (!getApproval(approvalId)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const result = await handleApprovalDecision({
    approvalId,
    decision,
    mode: mode || "sim",
  });
  return NextResponse.json(result);
}
