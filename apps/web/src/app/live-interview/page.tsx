import { AuthGuard } from "@/features/auth/AuthGuard";
import { LiveInterviewClient } from "@/features/interview/LiveInterviewClient";

export default function LiveInterviewPage() {
  return (
    <AuthGuard>
      <LiveInterviewClient />
    </AuthGuard>
  );
}
