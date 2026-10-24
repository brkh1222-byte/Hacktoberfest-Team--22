import { RequireAuth } from "@/components/AuthProvider";
import { Generator } from "@/components/Generator";
export default function GeneratePage() { return <RequireAuth><Generator /></RequireAuth>; }
