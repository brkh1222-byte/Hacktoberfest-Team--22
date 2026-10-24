import { RequireAuth } from "@/components/AuthProvider";
import { Collection } from "@/components/Collection";
export default function MySetsPage() {
  return (
    <RequireAuth>
      <Collection mine />
    </RequireAuth>
  );
}
