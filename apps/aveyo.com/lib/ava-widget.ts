export const OPEN_AVA_WIDGET_HREF = "#open-ava-widget";

type AvaAuthWindow = Window & {
  AvaAuth?: {
    open?: () => void;
  };
};

export function openAvaWidget(fallbackHref = "/contact") {
  if (typeof window === "undefined") {
    return;
  }

  const avaAuth = (window as AvaAuthWindow).AvaAuth;
  if (typeof avaAuth?.open === "function") {
    avaAuth.open();
    return;
  }

  const launcher = document.querySelector<HTMLButtonElement>('button[aria-label="Open Ava widget"]');
  if (launcher) {
    launcher.click();
    launcher.focus();
    return;
  }

  if (fallbackHref) {
    window.location.assign(fallbackHref);
  }
}
