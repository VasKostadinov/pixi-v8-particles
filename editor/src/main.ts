import "pixi.js/advanced-blend-modes";
import "../../src";
import "../../src/behaviors/editor";
import { Application } from "pixi.js";
import { PreviewStage } from "./PreviewStage";
import { defaultConfig } from "./defaultConfig";
import { renderPanel } from "./panel";
import { wireSplitter } from "./splitter";
import { wireTopbar } from "./topbar";
import { createToast } from "./toast";
import type { EditorCtx } from "./ctx";

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
  const bgPickerInput =
    bgPickerEl?.querySelector<HTMLInputElement>('input[type="color"]') ?? null;
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
    !(bgPickerInput instanceof HTMLInputElement)
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

  // Pixi's resizeTo only listens to window 'resize', so dragging the splitter
  // changes the preview's clientWidth without Pixi noticing — the CSS rule on
  // the canvas would then stretch its pixel buffer. Observe the preview itself
  // and trigger an immediate resize + re-center.
  new ResizeObserver(() => {
    app.resize();
    stage.relayout();
  }).observe(previewEl);

  const toast = createToast(toastEl);
  const ctx: EditorCtx = {
    notifyValue: () => stage.applyConfig(config),
    notifyStructural: () => {
      stage.applyConfig(config);
      renderPanel(scrollEl, config, ctx);
    },
    toast,
  };

  renderPanel(scrollEl, config, ctx);
  wireSplitter(splitterEl, workspaceEl);
  wireTopbar(topbarEl, config, ctx);

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
