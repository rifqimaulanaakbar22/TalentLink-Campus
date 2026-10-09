import { PageHeader } from "@/components/app/page-header";
import { TaskForm } from "@/components/app/task-form";

export default function TugasBaruPage() {
  return (
    <>
      <PageHeader
        title="Tugaskan Netra"
        description="Tulis kebutuhan riset dalam bahasa sehari-hari. Netra menyiapkan Link Brief berbukti dan menunggu persetujuan Anda."
      />
      <TaskForm />
    </>
  );
}
