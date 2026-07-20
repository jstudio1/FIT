import { requireRole } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("CLIENT");
  return (
    <AppShell role={user.role} name={user.fullName}>
      {children}
    </AppShell>
  );
}
