import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { pricingPlans } from "@/features/marketing/data";

export default function PricingPage() {
  return (
    <div className="container-section">
      <SectionTitle
        eyebrow="Pricing"
        title="Flexible plans for individuals and teams"
        subtitle="Simple pricing with support for startup and enterprise onboarding."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <Card key={plan.name} className="flex flex-col">
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="mt-1 text-3xl font-semibold text-brand-600 dark:text-brand-100">{plan.price}</p>
            <p className="mt-3 flex-1 text-slate-600 dark:text-slate-300">{plan.desc}</p>
            <button className="mt-6 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white">{plan.cta}</button>
          </Card>
        ))}
      </div>
    </div>
  );
}
