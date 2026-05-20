import type { EmitterConfigV3 } from "../../src/EmitterConfig";
import type { EditorCtx } from "./ctx";
import { on } from "./dom";
import { copyToClipboard, downloadJson, exportConfig } from "./exportJson";
import type { History } from "./history";
import { parseImport, readFileAsText } from "./importJson";
import { presets } from "./presets";

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
    const { json, replacedCount } = exportConfig(config);
    const ok = await copyToClipboard(json);
    ctx.toast(
      ok ? `Copied ${json.length} chars` : "Clipboard blocked — see console",
      ok ? "ok" : "err",
    );
    if (!ok) console.log(json);
    if (ok && replacedCount > 0) {
      ctx.toast(
        `${replacedCount} session-only texture(s) exported as filename references — replace with real URLs before reuse.`,
        "info",
      );
    }
  });

  on(button("download")!, "click", () => {
    const { json, replacedCount } = exportConfig(config);
    downloadJson(json);
    ctx.toast("Downloaded emitter.json", "ok");
    if (replacedCount > 0) {
      ctx.toast(
        `${replacedCount} session-only texture(s) exported as filename references — replace with real URLs before reuse.`,
        "info",
      );
    }
  });

  on(button("import")!, "click", () => openImportDialog(config, ctx));

  wirePresetPopover(config, ctx);
}

function wirePresetPopover(config: EmitterConfigV3, ctx: EditorCtx): void {
  const btn = document.getElementById("preset-btn");
  const popover = document.getElementById("preset-popover");
  if (!(btn instanceof HTMLButtonElement) || !(popover instanceof HTMLElement)) {
    throw new Error("Preset popover scaffold missing");
  }

  // Build rows once from the presets array. Each row carries its preset id on
  // a data attribute; the click handler below reads it to apply the preset.
  for (const p of presets) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "preset-row";
    row.dataset.presetId = p.id;
    row.innerHTML = `<span class="preset-dot" aria-hidden="true"></span><span class="preset-label"></span>`;
    // Set text via textContent to avoid HTML injection from preset names.
    row.querySelector<HTMLElement>(".preset-label")!.textContent = p.name;
    popover.appendChild(row);
  }

  // Track the active preset explicitly. Structural comparison against
  // `preset.build()` is unreliable because `controls.ensure()` mutates
  // `config` with default fields during renderPanel, so a fresh build never
  // strict-equals the post-render config. Instead, snapshot the post-render
  // config at apply time and detect "user has edited away" by re-comparing
  // the next time the popover opens.
  //
  // At boot, main.ts loaded presets[0] via defaultConfig(), so adopt that.
  let activePresetId: string | null = presets[0].id;
  let activeSnapshot: string | null = JSON.stringify(config);

  const refreshActive = () => {
    if (activePresetId !== null && activeSnapshot !== JSON.stringify(config)) {
      activePresetId = null;
      activeSnapshot = null;
    }
    for (const row of popover.querySelectorAll<HTMLElement>(".preset-row")) {
      row.classList.toggle("active", row.dataset.presetId === activePresetId);
    }
  };

  const togglePopover = (force?: boolean) => {
    const open = force ?? popover.hidden;
    if (open) refreshActive();
    popover.hidden = !open;
  };

  const applyPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;

    // Skip confirm when the user is browsing presets back-to-back.
    if (activePresetId === null) {
      if (!window.confirm(`Replace your current config with the ${preset.name} preset?`)) {
        return;
      }
    }

    const next = preset.build();
    const target = config as unknown as Record<string, unknown>;
    for (const k of Object.keys(target)) delete target[k];
    Object.assign(config, next);
    ctx.notifyStructural();
    // renderPanel has now mutated config with ensure() defaults. Snapshot the
    // post-render state so refreshActive can detect later panel edits.
    activePresetId = id;
    activeSnapshot = JSON.stringify(config);
    ctx.toast(`Loaded ${preset.name}`, "ok");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopover();
  });

  popover.addEventListener("click", (e) => {
    e.stopPropagation();
    const row = (e.target as Element).closest<HTMLElement>(".preset-row");
    if (!row) return;
    const id = row.dataset.presetId;
    if (!id) return;
    applyPreset(id);
    togglePopover(false);
  });

  document.addEventListener("click", (e) => {
    if (popover.hidden) return;
    if (btn.contains(e.target as Node)) return;
    if (popover.contains(e.target as Node)) return;
    togglePopover(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !popover.hidden) togglePopover(false);
  });
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
