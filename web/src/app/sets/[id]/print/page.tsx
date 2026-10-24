import { RequireAuth } from "@/components/AuthProvider";
import { SetDetail } from "@/components/SetDetail";
export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ answers?: string }> }) {
  return <RequireAuth><SetDetail id={(await params).id} printOnly teacherVersion={(await searchParams).answers === "1"} /></RequireAuth>;
}
