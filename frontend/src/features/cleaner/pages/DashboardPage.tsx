import { useAuthStore } from "@/store/auth";

export default function CleanerDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="py-12 px-4 mx-auto max-w-7xl">
      <h1 className="text-h1 mb-2">Dashboard — {user?.first_name}</h1>
      <p className="text-grey-mid">Cleaner dashboard — Phase 2</p>
    </div>
  );
}
