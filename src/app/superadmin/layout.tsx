import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/superadmin");
  if (user.role !== "superadmin") redirect("/dashboard");
  return children;
}
