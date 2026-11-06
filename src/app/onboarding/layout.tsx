import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding");
  return children;
}
