import { on } from "./dom";

const STORAGE_KEY = "pixi-v8-particles-editor:panel-width";
const MIN = 320;
const MAX_RATIO = 0.7;

export function wireSplitter(splitter: HTMLElement, workspace: HTMLElement): void {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const px = parseInt(stored, 10);
    if (Number.isFinite(px)) setWidth(px);
  }

  let dragging = false;
  on(splitter, "pointerdown", (ev) => {
    dragging = true;
    splitter.classList.add("dragging");
    splitter.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  on(splitter, "pointermove", (ev) => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const fromRight = rect.right - ev.clientX;
    setWidth(fromRight);
  });
  on(splitter, "pointerup", (ev) => {
    if (!dragging) return;
    dragging = false;
    splitter.classList.remove("dragging");
    splitter.releasePointerCapture(ev.pointerId);
    const cur = getComputedStyle(document.documentElement).getPropertyValue("--panel-width");
    window.localStorage.setItem(STORAGE_KEY, parseInt(cur, 10).toString());
  });
}

function setWidth(px: number): void {
  const maxPx = window.innerWidth * MAX_RATIO;
  const clamped = Math.round(Math.max(MIN, Math.min(maxPx, px)));
  document.documentElement.style.setProperty("--panel-width", `${clamped}px`);
}
