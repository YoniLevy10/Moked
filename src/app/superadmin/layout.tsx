import { redirect } from "next/navigation";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  void children;
  redirect("/");
}
