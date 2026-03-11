export function SectionTitle({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-100">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">{subtitle}</p>
    </div>
  );
}
