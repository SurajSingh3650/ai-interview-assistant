import dynamic from "next/dynamic";
import { AuthGuard } from "@/features/auth/AuthGuard";

const AnalyticsCharts = dynamic(() => import("@/features/analytics/AnalyticsCharts").then((m) => m.AnalyticsCharts), {
  ssr: false
});

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AnalyticsCharts />
    </AuthGuard>
  );
}
