import { requireRole } from "@/lib/authz";
import { AppShell } from "@/components/app-shell";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("OWNER");
  return (
    <AppShell role={user.role} name={user.fullName}>
      {children}
    </AppShell>
  );
}
