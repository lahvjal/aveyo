export { AvaWidgetEmbedBridge } from "./embed/ava-widget-embed-bridge";
export type { AvaWidgetEmbedBridgeProps } from "./embed/ava-widget-embed-bridge";
export { openAvaWidgetFromHost } from "./open-ava-host";
export type {
  HostSessionSnapshot,
  HostSessionUser,
  HostUserType,
  WidgetMessagePayload
} from "./types";
export type {
  RealtimeInvalidationKind,
  RealtimeInvalidationPayload,
  RealtimeTypingActor,
  RealtimeTypingPayload
} from "./api/realtime-stream";
export {
  createSignedOutSnapshot,
  normalizeEmail,
  normalizeHostSessionSnapshot,
  resolveDefaultApiBaseUrl,
  resolveDefaultWidgetUrl
} from "./session";
export {
  appendMessage,
  createLoggedOutConversation,
  createOptimisticCustomerGreetingConversation,
  createStarterConversation,
  createSystemStatusMessage,
  createTestModeConversation,
  normalizeMessageDraft
} from "./widget-state";
export { LauncherButton } from "./components/widget/launcher-button";
export { WidgetComposer } from "./components/widget/widget-composer";
export { WidgetTimeline } from "./components/widget/widget-timeline";
export { WidgetTestMode } from "./components/widget/widget-test-mode";
export { HandoffRequestModal } from "./components/widget/handoff-request-modal";
export { AvaWidgetShell } from "./components/widget/ava-widget-shell";
export { useWidgetAuthSession, type WidgetAuthSession } from "./auth/use-widget-auth-session";
export { createWidgetApiClient, type WidgetApiClient, type ImpersonationCustomer } from "./api/widget-api";
export { subscribeToRealtimeInvalidationStream } from "./api/realtime-stream";
export { useWidgetRealtimeInvalidation } from "./api/use-widget-realtime-invalidation";
export {
  applyLauncherFollow,
  getEntryImpulse,
  getPointerMetrics,
  resetLauncherFluidMotion,
  type EntryImpulse,
  type PointerMetrics
} from "./launcher-motion";
