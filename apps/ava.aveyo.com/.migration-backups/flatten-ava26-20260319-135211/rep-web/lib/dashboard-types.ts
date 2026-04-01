export type TicketTone = "sand" | "blue";

export interface Ticket {
  id: string;
  fullName: string;
  email: string;
  initials: string;
  waitLabel: string;
  preview: string;
  chipTone: TicketTone;
}

export interface HistoryNote {
  id: string;
  author: string;
  timestamp: string;
  body: string;
}

export interface CustomerPanelDetails {
  customerId: string;
  email: string;
  phone: string;
  address: string;
  fin: string;
  projectRef: string;
  projectStatus: string;
}
