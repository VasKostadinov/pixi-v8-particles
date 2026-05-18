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
  if (
    !(previewEl instanceof HTMLElement) ||
    !(scrollEl instanceof HTMLElement) ||
    !(splitterEl instanceof HTMLElement) ||
    !(workspaceEl instanceof HTMLElement) ||
    !(topbarEl instanceof HTMLElement) ||
    !(toastEl instanceof HTMLElement) ||
    !(hudCount instanceof HTMLElement) ||
    !(hudFps instanceof HTMLElement)
  ) {
    throw new Error("Editor DOM scaffold missing");
  }

  const app = new Application();
  await app.init({
    background: 0x0a0a0c,
    resizeTo: previewEl,
    antialias: true,
  });
  previewEl.appendChild(app.canvas);

  const stage = new PreviewStage(app);
  const config = defaultConfig();
  stage.applyConfig(config);

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
