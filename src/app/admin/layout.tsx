import { SuperadminShell } from "@/components/superadmin/SuperadminShell";
import { hasAdminGate } from "@/lib/auth/admin-gate";
import { getSessionUser } from "@/lib/auth/session";
import { AdminPasswordForm } from "./password-form";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasAdminGate())) return <AdminPasswordForm />;
  const user = await getSessionUser();
  return <SuperadminShell name={user?.name || "מנהל"}>{children}</SuperadminShell>;
}
