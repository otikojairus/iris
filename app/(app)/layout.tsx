import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="iris-shell">
      <Sidebar />
      <div className="iris-main">{children}</div>
    </div>
  );
}
