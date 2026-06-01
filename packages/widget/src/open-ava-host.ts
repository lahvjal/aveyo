export function openAvaWidgetFromHost(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const avaAuth = (window as Window & { AvaAuth?: { open: () => void } }).AvaAuth;
  if (typeof avaAuth?.open !== "function") {
    return false;
  }

  try {
    avaAuth.open();
    return true;
  } catch {
    return false;
  }
}
