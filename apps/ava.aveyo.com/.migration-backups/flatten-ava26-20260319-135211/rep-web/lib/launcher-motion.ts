export interface PointerMetrics {
  xNorm: number;
  yNorm: number;
  nx: number;
  ny: number;
}

export interface EntryImpulse {
  x: number;
  y: number;
}

export function resetLauncherFluidMotion(button: HTMLButtonElement) {
  button.style.setProperty("--launcher-shift-x", "0px");
  button.style.setProperty("--launcher-shift-y", "0px");
  button.style.setProperty("--launcher-tilt", "0deg");
  button.style.setProperty("--launcher-scale", "1");
  button.style.setProperty("--launcher-grad-shift-x", "0px");
  button.style.setProperty("--launcher-grad-shift-y", "0px");
  button.style.setProperty("--launcher-grad-rot", "0deg");
  button.style.setProperty("--launcher-grad-scale", "1.08");
}

export function getPointerMetrics(
  button: HTMLButtonElement,
  clientX: number,
  clientY: number
): PointerMetrics {
  const rect = button.getBoundingClientRect();
  const xNorm = (clientX - rect.left) / rect.width;
  const yNorm = (clientY - rect.top) / rect.height;
  const nx = xNorm - 0.5;
  const ny = yNorm - 0.5;
  return { xNorm, yNorm, nx, ny };
}

export function getEntryImpulse(xNorm: number, yNorm: number): EntryImpulse {
  const left = xNorm;
  const right = 1 - xNorm;
  const top = yNorm;
  const bottom = 1 - yNorm;

  if (left <= right && left <= top && left <= bottom) {
    return { x: 10, y: -(yNorm - 0.5) * 4.6 };
  }
  if (right <= left && right <= top && right <= bottom) {
    return { x: -10, y: -(yNorm - 0.5) * 4.6 };
  }
  if (top <= left && top <= right && top <= bottom) {
    return { x: -(xNorm - 0.5) * 4.6, y: 10 };
  }
  return { x: -(xNorm - 0.5) * 4.6, y: -10 };
}

export function applyLauncherFollow(
  button: HTMLButtonElement,
  nx: number,
  ny: number,
  includeTilt = true
) {
  button.style.setProperty("--launcher-shift-x", `${(nx * 6.4).toFixed(2)}px`);
  button.style.setProperty("--launcher-shift-y", `${(ny * 6.4).toFixed(2)}px`);
  if (includeTilt) {
    button.style.setProperty("--launcher-tilt", `${(nx * 15).toFixed(2)}deg`);
  }
  button.style.setProperty("--launcher-grad-shift-x", `${(nx * 9.5).toFixed(2)}px`);
  button.style.setProperty("--launcher-grad-shift-y", `${(ny * 9.5).toFixed(2)}px`);
  button.style.setProperty("--launcher-grad-rot", `${(-nx * 20 + ny * 12).toFixed(2)}deg`);
}
