export type HostUserType = "employee" | "customer" | "unknown";

export interface HostSessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface HostSessionSnapshot {
  authenticated: boolean;
  role: string;
  userType: HostUserType;
  user: HostSessionUser | null;
}

export interface WidgetMessagePayload {
  source?: string;
  type?: string;
  open?: boolean;
  payload?: unknown;
}
