import type { EmitterConfigV3 } from "../../src/EmitterConfig";
import type { EditorCtx } from "./ctx";
import { defaultConfig } from "./defaultConfig";
import { copyToClipboard, downloadJson, exportConfig } from "./exportJson";
import { on } from "./dom";

export function wireTopbar(
  topbar: HTMLElement,
  config: EmitterConfigV3,
  ctx: EditorCtx,
): void {
  const button = (action: string) =>
    topbar.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`);

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
}
