import { Application } from "pixi.js";
import "pixi.js/advanced-blend-modes";
import "../../src";
import "../../src/behaviors/editor";
import { PreviewStage } from "./PreviewStage";
import type { EditorCtx } from "./ctx";
import { defaultConfig } from "./defaultConfig";
import { createHistory, type History } from "./history";
import { renderPanel } from "./panel";
import { wireSplitter } from "./splitter";
import { createToast } from "./toast";
import { wireTopbar } from "./topbar";

async function boot(): Promise<void> {
  const previewEl = document.getElementById("preview-canvas");
  const scrollEl = document.getElementById("panel-scroll");
  const splitterEl = document.getElementById("splitter");
  const workspaceEl = document.getElementById("workspace");
  const topbarEl = document.getElementById("topbar");
  const toastEl = document.getElementById("toast");
  const hudCount = document.getElementById("particle-count");
  const hudFps = document.getElementById("fps");
  const bgPickerEl = document.getElementById("bg-picker");
  const bgPickerInput = bgPickerEl?.querySelector<HTMLInputElement>('input[type="color"]') ?? null;
  const followMouseBtn = document.getElementById("follow-mouse");
  if (
    !(previewEl instanceof HTMLElement) ||
    !(scrollEl instanceof HTMLElement) ||
    !(splitterEl instanceof HTMLElement) ||
    !(workspaceEl instanceof HTMLElement) ||
    !(topbarEl instanceof HTMLElement) ||
    !(toastEl instanceof HTMLElement) ||
    !(hudCount instanceof HTMLElement) ||
    !(hudFps instanceof HTMLElement) ||
    !(bgPickerEl instanceof HTMLElement) ||
    !(bgPickerInput instanceof HTMLInputElement) ||
    !(followMouseBtn instanceof HTMLButtonElement)
  ) {
    throw new Error("Editor DOM scaffold missing");
  }

  const initialBg = loadStoredBg() ?? "#0a0a0c";
  const app = new Application();
  await app.init({
    background: hexToNumber(initialBg),
    resizeTo: previewEl,
    antialias: true,
  });
  previewEl.appendChild(app.canvas);

  const applyBg = (hex: string) => {
    app.renderer.background.color = hexToNumber(hex);
    bgPickerEl.style.setProperty("--c", hex);
    try {
      localStorage.setItem("preview-bg", hex);
    } catch {
      // localStorage may be blocked (private mode, quota) — non-fatal.
    }
  };
  bgPickerInput.value = initialBg;
  bgPickerEl.style.setProperty("--c", initialBg);
  bgPickerInput.addEventListener("input", () => applyBg(bgPickerInput.value));

  const stage = new PreviewStage(app);
  const config = defaultConfig();
  stage.applyConfig(config);

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
  wireHistoryShortcuts(history);

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

function loadStoredBg(): string | null {
  try {
    const v = localStorage.getItem("preview-bg");
    return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

function hexToNumber(hex: string): number {
  return parseInt(hex.slice(1), 16);
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

function loadStoredFollowMouse(): boolean {
  try {
    return localStorage.getItem("preview-follow-mouse") === "1";
  } catch {
    return false;
  }
}
