/**
 * Minimal support-rep embed loader: hosts inject this script, then set
 * window.__AVEYO_REP_ORIGIN__ to the support app origin (e.g. https://ava.aveyo.com).
 * Customer-facing embeds should use the external customer embed path instead.
 */
(function () {
  var origin = typeof window !== "undefined" ? window.__AVEYO_REP_ORIGIN__ : "";
  if (!origin || typeof document === "undefined") {
    return;
  }
  var iframe = document.createElement("iframe");
  iframe.title = "Ava widget";
  iframe.src = origin.replace(/\/$/, "") + "/ava";
  iframe.setAttribute("allow", "clipboard-read; clipboard-write");
  iframe.style.cssText =
    "position:fixed;bottom:16px;right:16px;width:min(420px,100vw - 32px);height:min(640px,100vh - 32px);border:0;z-index:2147483646;box-shadow:0 12px 40px rgba(0,0,0,0.18);border-radius:12px;";
  document.body.appendChild(iframe);
})();
