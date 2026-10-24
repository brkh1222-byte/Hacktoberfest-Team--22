import { mn } from "@/lib/i18n/mn";
export default function Loading() {
  return (
    <div className="loading" role="status">
      {mn.loading}
    </div>
  );
}
