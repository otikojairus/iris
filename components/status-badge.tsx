import type { ProjectStatus } from "@/lib/types";

const LABELS: Record<ProjectStatus, string> = {
  ready: "Ready",
  generating: "Generating",
  draft: "Draft",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="iris-badge" data-tone={status}>
      <span className="iris-dot" />
      {LABELS[status]}
    </span>
  );
}
