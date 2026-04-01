export type FigmaComponentStatus = "pending_link" | "in_progress" | "implemented";

export interface FigmaComponentMapping {
  componentId: string;
  figmaNodeUrl?: string;
  implementedBy: string;
  tokenRefs: string[];
  notes: string;
  status: FigmaComponentStatus;
}

export const figmaComponentMap: FigmaComponentMapping[] = [];
