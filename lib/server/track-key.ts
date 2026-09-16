import { randomBytes } from "crypto";
import type { Project } from "@/lib/types";

export function newTrackKey(): string {
  return randomBytes(24).toString("hex");
}

export function withTrackKey(project: Project): Project {
  if (project.trackKey && project.trackKey.length >= 24) return project;
  return { ...project, trackKey: newTrackKey() };
}
