import Link from "next/link";
import { Mascot } from "@/components/app/mascot";
import { PageHeader } from "@/components/app/page-header";
import { TaskForm } from "@/components/app/task-form";
import { cn } from "@/app/_lib/cn";
import { mockWorkerBase } from "@/app/_lib/fixtures";
import { EXAMPLE_BRIEFS } from "@/app/_lib/mock-data";
import { ASSIGNABLE_WORKERS, formCopy, parseWorker } from "@/app/_lib/worker-copy";

export default async function TugasBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const workerId = parseWorker((await searchParams).worker);
  const copy = formCopy(workerId, EXAMPLE_BRIEFS);

  return (
    <>
      <PageHeader title={copy.pageTitle} description={copy.pageDescription} />

      <nav aria-label="Pilih Digital Worker" className="-mt-2 mb-6">
        <ul className="flex flex-wrap gap-2">
          {ASSIGNABLE_WORKERS.map((id) => {
            const w = mockWorkerBase.find((x) => x.id === id);
            if (!w) return null;
            const active = id === workerId;
            return (
              <li key={id}>
                <Link
                  href={`/tasks/new?worker=${id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-brand-100 font-medium text-brand-700"
                      : "bg-surface text-ink-muted shadow-card hover:text-ink",
                  )}
                >
                  <Mascot workerId={id} size={28} decorative />
                  <span>
                    {w.nama}, {w.jabatan}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <TaskForm key={workerId} workerId={workerId} />
    </>
  );
}
