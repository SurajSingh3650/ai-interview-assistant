import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { platformFeatures } from "@/features/marketing/data";

export default function FeaturesPage() {
  return (
    <div className="container-section">
      <SectionTitle
        eyebrow="Feature Catalog"
        title="Purpose-built for interview excellence"
        subtitle="Feature modules align with the architecture across clients, services, and AI orchestration."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {platformFeatures.map((item) => (
          <Card key={item.title}>
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{item.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
