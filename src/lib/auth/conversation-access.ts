/** Tenant-scoped conversation visibility (owner or superadmin). */
export function conversationVisibleToTenant(
  conversation: { tenantId: string } | null | undefined,
  tenantId: string,
  role: string,
): boolean {
  if (!conversation) return false;
  if (role === "superadmin") return true;
  return conversation.tenantId === tenantId;
}
