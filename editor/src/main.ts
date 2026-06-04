import { Application } from "pixi.js";
import "pixi.js/advanced-blend-modes";
import { registerAllBehaviors } from "../../src";
import "../../src/behaviors/editor";

// The editor's preview needs every behavior available; the library no longer
// registers them on import so consumers can tree-shake.
registerAllBehaviors();
import { PreviewStage } from "./PreviewStage";
import * as textureLoader from "./textureLoader";
import type { EditorCtx } from "./ctx";
import { defaultConfig } from "./defaultConfig";
import { createHistory, type History } from "./history";
import { renderPanel } from "./panel";
import { wireSplitter } from "./splitter";
import { createToast } from "./toast";
import { attachGlobalDrop } from "./globalDrop";
import { wireTopbar } from "./topbar";

async function boot(): Promise<void> {
  const previewEl = document.getElementById("preview-canvas");
  const previewSectionEl = document.getElementById("preview");
  const scrollEl = document.getElementById("panel-scroll");
  const splitterEl = document.getElementById("splitter");
  const workspaceEl = document.getElementById("workspace");
  const topbarEl = document.getElementById("topbar");
  const toastEl = document.getElementById("toast");
  const hudCount = document.getElementById("particle-count");
  const hudFps = document.getElementById("fps");
  const hudTimeScale = document.getElementById("time-scale");
  const bgModeBtn = document.getElementById("bg-mode");
  const bgModePopover = document.getElementById("bg-mode-popover");
  const bgModeColorInput =
    bgModePopover?.querySelector<HTMLInputElement>('input[type="color"]') ?? null;
  const followMouseBtn = document.getElementById("follow-mouse");
  if (
    !(previewEl instanceof HTMLElement) ||
    !(previewSectionEl instanceof HTMLElement) ||
    !(scrollEl instanceof HTMLElement) ||
    !(splitterEl instanceof HTMLElement) ||
    !(workspaceEl instanceof HTMLElement) ||
    !(topbarEl instanceof HTMLElement) ||
    !(toastEl instanceof HTMLElement) ||
    !(hudCount instanceof HTMLElement) ||
    !(hudFps instanceof HTMLElement) ||
    !(hudTimeScale instanceof HTMLElement) ||
    !(bgModeBtn instanceof HTMLButtonElement) ||
    !(bgModePopover instanceof HTMLElement) ||
    !(bgModeColorInput instanceof HTMLInputElement) ||
    !(followMouseBtn instanceof HTMLButtonElement)
  ) {
    throw new Error("Editor DOM scaffold missing");
  }

  const initialBg = loadStoredBg() ?? "#0a0a0c";
  const initialBgMode = loadStoredBgMode();
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: previewEl,
    antialias: true,
  });
  previewEl.appendChild(app.canvas);

  let bgColor = initialBg;
  let bgMode: BgMode = initialBgMode;

  const applyBg = () => {
    previewSectionEl.dataset.bgMode = bgMode;
    previewSectionEl.style.setProperty("--bg-color", bgColor);
    // Additive/screen blend modes need an OPAQUE backdrop to composite against.
    // On a transparent framebuffer, an opaque-black texture background adds its
    // alpha (add = [ONE, ONE]) into the buffer, turning that region opaque black
    // and occluding the CSS background — the particle's black box never drops out.
    // In "solid" mode we therefore make the pixi canvas itself opaque with the
    // chosen color; checker/grid stay transparent so their CSS pattern shows
    // through (those modes are for inspecting transparency, not blended looks).
    if (bgMode === "solid") {
      app.renderer.background.color = bgColor;
      app.renderer.background.alpha = 1;
    } else {
      app.renderer.background.alpha = 0;
    }
    bgModeBtn.dataset.mode = bgMode;
    bgModeBtn.style.setProperty("--c", bgColor);
    bgModeColorInput.value = bgColor;
    for (const row of bgModePopover.querySelectorAll<HTMLElement>(".bg-mode-row")) {
      row.classList.toggle("active", row.dataset.mode === bgMode);
      row.style.setProperty("--c", bgColor);
    }
    try {
      localStorage.setItem("preview-bg", bgColor);
      localStorage.setItem("preview-bg-mode", bgMode);
    } catch {
      // localStorage may be blocked (private mode, quota) — non-fatal.
    }
  };
  applyBg();

  bgModeColorInput.addEventListener("input", () => {
    bgColor = bgModeColorInput.value;
    // Picking a color implies the user wants solid mode.
    bgMode = "solid";
    applyBg();
  });

  const togglePopover = (force?: boolean) => {
    const open = force ?? bgModePopover.hidden;
    bgModePopover.hidden = !open;
  };
  bgModeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopover();
  });
  bgModePopover.addEventListener("click", (e) => {
    e.stopPropagation();
    const row = (e.target as Element).closest<HTMLElement>(".bg-mode-row");
    if (!row) return;
    // Don't activate the row when the click was on the color picker itself —
    // let the native picker open and the input event handle the mode switch.
    if ((e.target as Element).closest(".bg-mode-color")) return;
    const mode = row.dataset.mode as BgMode | undefined;
    if (!mode) return;
    bgMode = mode;
    applyBg();
    togglePopover(false);
  });
  document.addEventListener("click", (e) => {
    if (bgModePopover.hidden) return;
    if (bgModeBtn.contains(e.target as Node)) return;
    if (bgModePopover.contains(e.target as Node)) return;
    togglePopover(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !bgModePopover.hidden) togglePopover(false);
  });

  const stage = new PreviewStage(app);
  const config = defaultConfig();
  stage.applyConfig(config);

  // A dropped image's bitmap loads asynchronously into pixi's cache after
  // addFile returns. Re-apply the config so the emitter picks up the now-
  // resolvable texture instead of rendering Texture.WHITE.
  textureLoader.subscribe(() => stage.applyConfig(config));

  const initialFollow = loadStoredFollowMouse();
  const applyFollow = (on: boolean) => {
    stage.setFollowMouse(on);
    followMouseBtn.classList.toggle("on", on);
    app.canvas.style.cursor = on ? "crosshair" : "";
    try {
      localStorage.setItem("preview-follow-mouse", on ? "1" : "0");
    } catch {
      // localStorage may be blocked — non-fatal.
    }
  };
  applyFollow(initialFollow);
  followMouseBtn.addEventListener("click", () => {
    applyFollow(!followMouseBtn.classList.contains("on"));
  });

  // Pixi's resizeTo only listens to window 'resize', so dragging the splitter
  // changes the preview's clientWidth without Pixi noticing — the CSS rule on
  // the canvas would then stretch its pixel buffer. Observe the preview itself
  // and trigger an immediate resize + re-center.
  new ResizeObserver(() => {
    app.resize();
    stage.relayout();
  }).observe(previewEl);

  const toast = createToast(toastEl);

  textureLoader.subscribeLoadErrors(({ url, reason }) => {
    if (reason === "cors") {
      toast(
        `Image blocked by CORS — host doesn't allow cross-origin use. Try a CORS-friendly URL or drop the file.`,
        "err",
      );
    } else if (reason === "decode") {
      toast(`Could not decode image: ${url}`, "err");
    } else {
      toast(`Failed to load image — see console for details.`, "err");
    }
  });

  const rebuildPanel = () => {
    const prevScroll = scrollEl.scrollTop;
    renderPanel(scrollEl, config, ctx);
    scrollEl.scrollTop = prevScroll;
  };

  // Forward-declared so ctx can call into history before it's constructed.
  // History is built after the initial renderPanel so the baseline snapshot
  // includes any defaults injected by control ensure() calls.
  let history: History | null = null;

  const ctx: EditorCtx = {
    notifyValue: () => {
      stage.applyConfig(config);
      history?.recordValueChange();
    },
    notifyStructural: () => {
      stage.applyConfig(config);
      rebuildPanel();
      history?.recordStructuralChange();
    },
    toast,
  };

  renderPanel(scrollEl, config, ctx);
  history = createHistory({
    getSnapshot: () => JSON.stringify(config),
    applySnapshot: (snap) => {
      const next = JSON.parse(snap) as typeof config;
      const target = config as unknown as Record<string, unknown>;
      for (const k of Object.keys(target)) delete target[k];
      Object.assign(config, next);
      stage.applyConfig(config);
      rebuildPanel();
    },
  });
  wireSplitter(splitterEl, workspaceEl);
  wireTopbar(topbarEl, config, ctx, history);
  attachGlobalDrop(workspaceEl, config, ctx);
  wireHistoryShortcuts(history);
  wireTimeScaleControls(stage, hudTimeScale);

  // HUD: fps + alive particle count
  let frame = 0;
  let last = performance.now();
  app.ticker.add(() => {
    frame++;
    const now = performance.now();
    if (now - last >= 500) {
      const fps = Math.round((frame * 1000) / (now - last));
      hudFps.textContent = `${fps} fps`;
      frame = 0;
      last = now;
    }
    hudCount.textContent = `${stage.particleCount()} particles`;
  });
}

void boot();

type BgMode = "solid" | "checker" | "grid";

function loadStoredBg(): string | null {
  try {
    const v = localStorage.getItem("preview-bg");
    return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

function loadStoredBgMode(): BgMode {
  try {
    const v = localStorage.getItem("preview-bg-mode");
    if (v === "solid" || v === "checker" || v === "grid") return v;
  } catch {
    // fall through to default
  }
  return "solid";
}

function wireHistoryShortcuts(history: History): void {
  // Skip when focused in a text-entry field so the browser's native text-undo
  // wins for that input — sliders/buttons fall through to the global history.
  const isTextField = (node: Element | null): boolean => {
    if (!(node instanceof HTMLElement)) return false;
    if (node instanceof HTMLTextAreaElement) return true;
    if (node instanceof HTMLInputElement) {
      const t = node.type.toLowerCase();
      return (
        t === "text" ||
        t === "number" ||
        t === "search" ||
        t === "url" ||
        t === "email" ||
        t === "password"
      );
    }
    return node.isContentEditable;
  };

  window.addEventListener("keydown", (ev) => {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    if (isTextField(document.activeElement)) return;
    const key = ev.key.toLowerCase();
    if (key === "z" && !ev.shiftKey) {
      ev.preventDefault();
      history.undo();
    } else if ((key === "z" && ev.shiftKey) || key === "y") {
      ev.preventDefault();
      history.redo();
    }
  });
}

function wireTimeScaleControls(stage: PreviewStage, readout: HTMLElement): void {
  const MAX = 8;
  const MIN_FINE = 0.1;
  // Sub-1× moves in 0.1 steps; ≥1× moves in whole steps. Round the fine zone so
  // repeated 0.1 additions don't drift (0.1 + 0.2 → 0.30000000000000004).
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const format = (s: number): string => {
    if (s === 0) return "paused";
    return Number.isInteger(s) ? `${s}×` : `${s.toFixed(1)}×`;
  };

  const apply = (next: number) => {
    const clamped = Math.min(MAX, Math.max(0, next));
    stage.setTimeScale(clamped);
    readout.textContent = format(clamped);
    readout.classList.toggle("scaled", clamped !== 1);
  };

  const faster = (s: number) => (s >= 1 ? s + 1 : round1(s + 0.1));
  // Left never reaches 0 — only ↓ (freeze) does; floor the fine zone at 0.1×.
  const slower = (s: number) => (s > 1 ? s - 1 : Math.max(MIN_FINE, round1(s - 0.1)));

  // Clicking the readout is the mouse equivalent of ↑ (reset to 1×).
  readout.addEventListener("click", () => apply(1));

  const isFormControl = (node: Element | null): boolean => {
    if (!(node instanceof HTMLElement)) return false;
    return (
      node instanceof HTMLInputElement ||
      node instanceof HTMLTextAreaElement ||
      node instanceof HTMLSelectElement ||
      node.isContentEditable
    );
  };

  window.addEventListener("keydown", (ev) => {
    // Let focused sliders / number fields keep their native arrow behavior.
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (isFormControl(document.activeElement)) return;
    const current = stage.getTimeScale();
    switch (ev.key) {
      case "ArrowUp":
        apply(1);
        break;
      case "ArrowDown":
        apply(0);
        break;
      case "ArrowRight":
        apply(faster(current));
        break;
      case "ArrowLeft":
        apply(slower(current));
        break;
      default:
        return;
    }
    ev.preventDefault();
  });
}

function loadStoredFollowMouse(): boolean {
  try {
    return localStorage.getItem("preview-follow-mouse") === "1";
  } catch {
    return false;
  }
}
