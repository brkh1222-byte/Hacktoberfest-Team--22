import { RequireAuth } from "@/components/AuthProvider";
import { Collection } from "@/components/Collection";
export default function LibraryPage() { return <RequireAuth><Collection /></RequireAuth>; }
