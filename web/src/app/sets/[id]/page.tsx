import { RequireAuth } from "@/components/AuthProvider";
import { SetDetail } from "@/components/SetDetail";
export default async function SetPage({ params }: { params: Promise<{ id: string }> }) { return <RequireAuth><SetDetail id={(await params).id} /></RequireAuth>; }
