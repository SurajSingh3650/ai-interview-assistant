import { AuthGuard } from "@/features/auth/AuthGuard";
import { PracticeClient } from "@/features/practice/PracticeClient";

export default function PracticePage() {
  return (
    <AuthGuard>
      <PracticeClient />
    </AuthGuard>
  );
}
