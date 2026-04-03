export interface LoadCentralEnvOptions {
  source?: string;
  workspaceRoot?: string;
  nodeEnv?: string;
  override?: boolean;
}

export interface LoadCentralEnvResult {
  workspaceRoot: string;
  nodeEnv: string;
  loadedFiles: string[];
}

export function resolveCentralEnvFiles(workspaceRoot: string, nodeEnv: string): string[];
export function loadCentralEnv(options?: LoadCentralEnvOptions): LoadCentralEnvResult;
