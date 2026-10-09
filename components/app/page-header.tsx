/** Judul halaman besar ("Dashboard Overview" di inspirasi). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pt-4 pb-6 sm:flex-row sm:items-end sm:justify-between md:pt-6">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-9 font-semibold tracking-tight sm:text-[32px] sm:leading-10">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-5.5 text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
