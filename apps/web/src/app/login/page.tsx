import { Suspense } from "react";
import { AuthForm } from "@/features/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="container-section max-w-xl">
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
