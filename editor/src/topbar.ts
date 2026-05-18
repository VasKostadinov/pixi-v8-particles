import type { EmitterConfigV3 } from "../../src/EmitterConfig";
import type { EditorCtx } from "./ctx";
import { defaultConfig } from "./defaultConfig";
import { on } from "./dom";
import { copyToClipboard, downloadJson, exportConfig } from "./exportJson";
import type { History } from "./history";
import { parseImport, readFileAsText } from "./importJson";

export function wireTopbar(
  topbar: HTMLElement,
  config: EmitterConfigV3,
  ctx: EditorCtx,
  history: History,
): void {
  const button = (action: string) =>
    topbar.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`);

  const undoBtn = button("undo")!;
  const redoBtn = button("redo")!;
  on(undoBtn, "click", () => history.undo());
  on(redoBtn, "click", () => history.redo());
  const refreshHistoryButtons = () => {
    undoBtn.disabled = !history.canUndo();
    redoBtn.disabled = !history.canRedo();
  };
  history.subscribe(refreshHistoryButtons);
  refreshHistoryButtons();

  on(button("copy")!, "click", async () => {
    const text = exportConfig(config);
    const ok = await copyToClipboard(text);
    ctx.toast(
      ok ? `Copied ${text.length} chars` : "Clipboard blocked — see console",
      ok ? "ok" : "err",
    );
    if (!ok) console.log(text);
  });

  on(button("download")!, "click", () => {
    downloadJson(exportConfig(config));
    ctx.toast("Downloaded emitter.json", "ok");
  });

  on(button("reset")!, "click", () => {
    if (!window.confirm("Reset config to default?")) return;
    const next = defaultConfig();
    const target = config as unknown as Record<string, unknown>;
    for (const k of Object.keys(target)) delete target[k];
    Object.assign(config, next);
    ctx.notifyStructural();
    ctx.toast("Reset to default");
  });

  on(button("import")!, "click", () => openImportDialog(config, ctx));
}

function openImportDialog(config: EmitterConfigV3, ctx: EditorCtx): void {
  const dialog = document.getElementById("import-dialog");
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error("Import dialog missing");
  }
  const textarea = dialog.querySelector<HTMLTextAreaElement>('textarea[data-action="text"]');
  const fileInput = dialog.querySelector<HTMLInputElement>('input[data-action="file"]');
  const errorEl = dialog.querySelector<HTMLElement>('[data-action="error"]');
  const applyBtn = dialog.querySelector<HTMLButtonElement>('button[data-action="apply"]');
  const cancelBtn = dialog.querySelector<HTMLButtonElement>('button[data-action="cancel"]');
  const closeBtn = dialog.querySelector<HTMLButtonElement>('button[data-action="close"]');
  if (!textarea || !fileInput || !errorEl || !applyBtn || !cancelBtn || !closeBtn) {
    throw new Error("Import dialog scaffold missing");
  }

  const showError = (msg: string | null) => {
    if (msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
  };

  textarea.value = "";
  fileInput.value = "";
  showError(null);

  const onFile = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      textarea.value = await readFileAsText(file);
      showError(null);
    } catch (e) {
      showError(`Could not read file: ${(e as Error).message}`);
    }
  };

  const onApply = () => {
    const result = parseImport(textarea.value);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    const target = config as unknown as Record<string, unknown>;
    for (const k of Object.keys(target)) delete target[k];
    Object.assign(config, result.config);
    ctx.notifyStructural();
    ctx.toast("Imported config", "ok");
    cleanup();
    dialog.close();
  };

  const onCancel = () => {
    cleanup();
    dialog.close();
  };

  const onBackdrop = (e: MouseEvent) => {
    if (e.target === dialog) onCancel();
  };

  const cleanup = () => {
    fileInput.removeEventListener("change", onFile);
    applyBtn.removeEventListener("click", onApply);
    cancelBtn.removeEventListener("click", onCancel);
    closeBtn.removeEventListener("click", onCancel);
    dialog.removeEventListener("click", onBackdrop);
    dialog.removeEventListener("cancel", onCancel);
  };

  fileInput.addEventListener("change", onFile);
  applyBtn.addEventListener("click", onApply);
  cancelBtn.addEventListener("click", onCancel);
  closeBtn.addEventListener("click", onCancel);
  dialog.addEventListener("click", onBackdrop);
  dialog.addEventListener("cancel", onCancel);

  dialog.showModal();
  textarea.focus();
}
