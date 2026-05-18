export type ToastKind = "ok" | "err" | "info";

export interface EditorCtx {
  /** Value-only change — rebuild the live preview, leave the DOM alone. */
  notifyValue: () => void;
  /** Structural change (add/remove/reorder/swap type) — rebuild panel + preview. */
  notifyStructural: () => void;
  toast: (message: string, kind?: ToastKind) => void;
}
