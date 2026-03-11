import { AuthGuard } from "@/features/auth/AuthGuard";
import { SettingsClient } from "@/features/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsClient />
    </AuthGuard>
  );
}
