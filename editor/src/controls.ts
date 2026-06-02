import type {
  BooleanProperty,
  ColorProperty,
  ImageProperty,
  NumberProperty,
  PointProperty,
  SelectProperty,
  TextProperty,
} from "../../src/behaviors/BehaviorConfigSchema";
import type { EditorCtx } from "./ctx";
import { el, on } from "./dom";
import * as textureLoader from "./textureLoader";
import { attachDropZone } from "./dropZone";

type Target = Record<string, unknown>;

export function makeRow(label: string, control: HTMLElement, title?: string): HTMLElement {
  const labelNode = el("div", { class: "label", title: title ?? label }, [label]);
  const controlNode = el("div", { class: "control" }, [control]);
  return el("div", { class: "row" }, [labelNode, controlNode]);
}

function ensure<T>(target: Target, key: string, factory: () => T): T {
  if (target[key] === undefined) target[key] = factory();
  return target[key] as T;
}

/* ---------- number ---------- */
export function numberControl(target: Target, p: NumberProperty, ctx: EditorCtx): HTMLElement {
  ensure(target, p.name, () => p.default);
  const value = target[p.name] as number;

  const wrap = el("div", { class: "control" });

  const hasRange = p.min !== undefined && p.max !== undefined;
  let slider: HTMLInputElement | null = null;
  if (hasRange) {
    slider = el("input", {
      type: "range",
      class: "slider",
      min: p.min!,
      max: p.max!,
      step: stepFor(p.min!, p.max!),
      value: String(value),
    });
    wrap.appendChild(slider);
  }
  const input = el("input", {
    type: "number",
    class: "input num",
    value: String(value),
    step: hasRange ? stepFor(p.min!, p.max!) : "any",
  });
  if (p.min !== undefined) input.min = String(p.min);
  if (p.max !== undefined) input.max = String(p.max);
  wrap.appendChild(input);

  // Commit from the text input: update target + mirror to slider, but DON'T
  // rewrite input.value — that would clobber intermediate states like "0." or
  // "1e" while the user is mid-typing.
  const commitFromInput = (v: number) => {
    if (!Number.isFinite(v)) return;
    target[p.name] = v;
    if (slider) slider.value = String(v);
    ctx.notifyValue();
  };
  // Commit from the slider: update target + mirror to input (slider isn't the
  // active text field, so overwriting the displayed text is safe).
  const commitFromSlider = (v: number) => {
    if (!Number.isFinite(v)) return;
    target[p.name] = v;
    input.value = String(v);
    ctx.notifyValue();
  };
  if (slider) {
    on(slider, "input", () => commitFromSlider(parseFloat(slider!.value)));
  }
  on(input, "input", () => commitFromInput(parseFloat(input.value)));
  // On blur, normalize the displayed text so trailing "." / empty becomes the
  // committed numeric value.
  on(input, "blur", () => {
    const v = parseFloat(input.value);
    if (Number.isFinite(v)) input.value = String(v);
    else input.value = String(target[p.name] ?? p.default);
  });

  return wrap;
}

function stepFor(min: number, max: number): string {
  const range = Math.abs(max - min);
  if (range <= 2) return "0.01";
  if (range <= 20) return "0.1";
  return "1";
}

/* ---------- color ---------- */
export function colorControl(target: Target, p: ColorProperty, ctx: EditorCtx): HTMLElement {
  ensure(target, p.name, () => p.default);
  return colorPickerEl(target, p.name, ctx);
}

export function colorPickerEl(target: Target, key: string, ctx: EditorCtx): HTMLElement {
  const value = normalizeHex(target[key] as string);
  target[key] = value;

  const wrap = el("div", { class: "color-input" });
  const swatch = el("button", { class: "color-swatch", style: `--c:${value}` });
  const picker = el("input", { type: "color", value });
  swatch.appendChild(picker);

  const text = el("input", { class: "input", value });
  text.style.flex = "1";

  const commit = (v: string) => {
    const hex = normalizeHex(v);
    target[key] = hex;
    swatch.style.setProperty("--c", hex);
    picker.value = hex;
    text.value = hex;
    ctx.notifyValue();
  };
  on(picker, "input", () => commit(picker.value));
  on(text, "change", () => commit(text.value));

  wrap.appendChild(swatch);
  wrap.appendChild(text);
  return wrap;
}

function normalizeHex(value: string): string {
  if (!value) return "#ffffff";
  let v = value.trim();
  if (!v.startsWith("#")) v = "#" + v;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return "#ffffff";
  return v.toLowerCase();
}

/* ---------- boolean ---------- */
export function booleanControl(target: Target, p: BooleanProperty, ctx: EditorCtx): HTMLElement {
  ensure(target, p.name, () => p.default);
  const value = !!target[p.name];
  return booleanEl(value, (v) => {
    target[p.name] = v;
    ctx.notifyValue();
  });
}

export function booleanEl(value: boolean, onChange: (v: boolean) => void): HTMLElement {
  const btn = el("button", { class: value ? "toggle on" : "toggle", type: "button" });
  on(btn, "click", () => {
    const next = !btn.classList.contains("on");
    btn.classList.toggle("on", next);
    onChange(next);
  });
  return btn;
}

/* ---------- text ---------- */
export function textControl(target: Target, p: TextProperty, ctx: EditorCtx): HTMLElement {
  ensure(target, p.name, () => p.default);
  const input = el("input", { class: "input", value: String(target[p.name] ?? "") });
  on(input, "input", () => {
    target[p.name] = input.value;
    ctx.notifyValue();
  });
  return input;
}

/* ---------- image (URL string + drag-and-drop) ---------- */
export function imageControl(target: Target, p: ImageProperty, ctx: EditorCtx): HTMLElement {
  ensure(target, p.name, () => "");
  const initial = String(target[p.name] ?? "");
  const input = el("input", {
    class: "input",
    value: initial,
    placeholder: "Drop image or paste URL",
  });
  // Kick off a load for any URL the field starts with (default config, panel
  // rebuild after a config import, etc.) so particles aren't stuck on WHITE.
  textureLoader.ensureLoaded(initial.trim());
  on(input, "input", () => {
    target[p.name] = input.value;
    textureLoader.ensureLoaded(input.value.trim());
    ctx.notifyValue();
  });

  // Wrap in a block-level div so the drop target is a stable container rather
  // than the <input> itself (focused inputs intercept drop events on some
  // browsers, and a div is also a more reliable hook for the .is-dragover
  // outline).
  const wrap = el("div", { class: "image-drop" }, [input]);
  attachDropZone(
    wrap,
    (files) => {
      if (files.length === 0) {
        ctx.toast("No image files in drop", "info");
        return;
      }
      const first = files[0];
      const url = textureLoader.addFile(first);
      target[p.name] = url;
      input.value = url;
      ctx.notifyValue();
      if (files.length > 1) {
        ctx.toast(
          `Only one texture per slot — used ${first.name}, ignored ${files.length - 1}`,
          "info",
        );
      }
    },
    { stopPropagation: true },
  );

  return wrap;
}

/* ---------- select ---------- */
export function selectControl(target: Target, p: SelectProperty, ctx: EditorCtx): HTMLElement {
  ensure(target, p.name, () => p.default);
  const sel = el("select", { class: "select" });
  for (const opt of p.options) {
    const o = el("option", { value: opt.value }, [opt.label]);
    sel.appendChild(o);
  }
  sel.value = String(target[p.name]);
  on(sel, "change", () => {
    target[p.name] = sel.value;
    ctx.notifyValue();
  });
  return sel;
}

/* ---------- point ---------- */
export function pointControl(target: Target, p: PointProperty, ctx: EditorCtx): HTMLElement {
  const obj = ensure(target, p.name, () => ({ ...p.default })) as {
    x: number;
    y: number;
  };
  const wrap = el("div", { class: "point" });
  const lx = el("span", { class: "axis" }, ["x"]);
  const xi = el("input", {
    class: "input num",
    type: "number",
    step: "1",
    value: String(obj.x),
  });
  xi.style.width = "100%";
  const ly = el("span", { class: "axis" }, ["y"]);
  const yi = el("input", {
    class: "input num",
    type: "number",
    step: "1",
    value: String(obj.y),
  });
  yi.style.width = "100%";
  on(xi, "input", () => {
    const v = parseFloat(xi.value);
    if (Number.isFinite(v)) {
      obj.x = v;
      ctx.notifyValue();
    }
  });
  on(yi, "input", () => {
    const v = parseFloat(yi.value);
    if (Number.isFinite(v)) {
      obj.y = v;
      ctx.notifyValue();
    }
  });
  wrap.appendChild(lx);
  wrap.appendChild(xi);
  wrap.appendChild(ly);
  wrap.appendChild(yi);
  return wrap;
}
