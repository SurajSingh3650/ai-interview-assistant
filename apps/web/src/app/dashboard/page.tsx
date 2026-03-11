import { AuthGuard } from "@/features/auth/AuthGuard";
import { DashboardClient } from "@/features/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardClient />
    </AuthGuard>
  );
}
