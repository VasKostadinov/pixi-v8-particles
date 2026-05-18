import type { ToastKind } from "./ctx";

export function createToast(node: HTMLElement) {
  let hideTimer: number | null = null;
  return (message: string, kind: ToastKind = "info") => {
    node.textContent = message;
    node.classList.remove("ok", "err");
    if (kind === "ok") node.classList.add("ok");
    if (kind === "err") node.classList.add("err");
    node.classList.add("show");
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      node.classList.remove("show");
    }, 1800);
  };
}
