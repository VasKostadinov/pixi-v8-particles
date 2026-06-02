import type {
  ListProperty,
  ObjectProperty,
  Property,
  SelectSubConfigProperty,
} from "../../src/behaviors/BehaviorConfigSchema";
import { buildDefault, defaultForProperty } from "./behaviorRegistry";
import { dictionaries } from "./shapeRegistry";
import type { EditorCtx } from "./ctx";
import { el, on } from "./dom";
import {
  booleanControl,
  colorControl,
  imageControl,
  makeRow,
  numberControl,
  pointControl,
  selectControl,
  textControl,
} from "./controls";
import { colorListControl, numberListControl } from "./valueListEditor";
import * as textureLoader from "./textureLoader";
import { attachDropZone } from "./dropZone";

type Target = Record<string, unknown>;

/**
 * Given a list's entryType and a fresh entry, decide where to write a dropped
 * blob URL. Writes the URL into the appropriate image slot.
 *
 * Supported shapes:
 *   - entryType is ImageProperty itself → the entry is a raw string; write it directly.
 *   - entryType is ObjectProperty with a nested ImageProperty → write into that field.
 */
function applyImageToListEntry(
  arr: unknown[],
  index: number,
  entryType: Property,
  url: string,
): void {
  if (entryType.type === "image") {
    arr[index] = url;
    return;
  }
  if (entryType.type === "object") {
    const inner = entryType.props.find((sp) => sp.type === "image");
    if (!inner) return;
    const entry = arr[index] as Record<string, unknown>;
    entry[inner.name] = url;
  }
}

export function renderProperty(
  parent: HTMLElement,
  target: Target,
  prop: Property,
  ctx: EditorCtx,
): void {
  switch (prop.type) {
    case "number":
      parent.appendChild(makeRow(prop.title, numberControl(target, prop, ctx), prop.description));
      return;
    case "color":
      parent.appendChild(makeRow(prop.title, colorControl(target, prop, ctx), prop.description));
      return;
    case "boolean":
      parent.appendChild(makeRow(prop.title, booleanControl(target, prop, ctx), prop.description));
      return;
    case "text":
      parent.appendChild(makeRow(prop.title, textControl(target, prop, ctx), prop.description));
      return;
    case "image":
      parent.appendChild(makeRow(prop.title, imageControl(target, prop, ctx), prop.description));
      return;
    case "select":
      parent.appendChild(makeRow(prop.title, selectControl(target, prop, ctx), prop.description));
      return;
    case "point":
      parent.appendChild(makeRow(prop.title, pointControl(target, prop, ctx), prop.description));
      return;
    case "numberList":
      parent.appendChild(numberListControl(target, prop, ctx));
      return;
    case "colorList":
      parent.appendChild(colorListControl(target, prop, ctx));
      return;
    case "list":
      renderList(parent, target, prop, ctx);
      return;
    case "object":
      renderObject(parent, target, prop, ctx);
      return;
    case "subconfig":
      renderSubConfig(parent, target, prop, ctx);
      return;
  }
}

function renderObject(
  parent: HTMLElement,
  target: Target,
  p: ObjectProperty,
  ctx: EditorCtx,
): void {
  const key = p.name || "__inline";
  const obj =
    p.name === "" ? target : ((target[key] ??= buildDefault(p.props)), target[key] as Target);
  if (p.title && p.name) {
    parent.appendChild(el("div", { class: "section-title", style: "margin-top:4px" }, [p.title]));
  }
  for (const sp of p.props) renderProperty(parent, obj, sp, ctx);
}

function renderList(parent: HTMLElement, target: Target, p: ListProperty, ctx: EditorCtx): void {
  if (target[p.name] === undefined) target[p.name] = [];
  const arr = target[p.name] as unknown[];

  const wrap = el("div", { class: "vlist" });
  const head = el("div", { class: "vlist-title" }, [
    el("span", {}, [p.title]),
    el("span", { class: "meta" }, [`${arr.length} items`]),
  ]);
  wrap.appendChild(head);

  arr.forEach((_entry, i) => {
    const row = el("div", { class: "row" });
    const label = el("div", { class: "label" }, [`${p.entryType.title || "item"} ${i}`]);
    const control = el("div", {
      class: "control",
      style: "flex-direction:column; align-items:stretch; gap:6px",
    });
    renderProperty(
      control,
      arr as unknown as Target,
      { ...p.entryType, name: String(i) } as Property,
      ctx,
    );
    const remove = el("button", { class: "btn-mini danger" }, ["remove"]);
    on(remove, "click", () => {
      arr.splice(i, 1);
      ctx.notifyStructural();
    });
    control.appendChild(remove);
    row.appendChild(label);
    row.appendChild(control);
    wrap.appendChild(row);
  });

  const add = el("button", { class: "btn-mini" }, [`+ add ${p.entryType.title || "item"}`]);
  on(add, "click", () => {
    arr.push(defaultForProperty(p.entryType));
    ctx.notifyStructural();
  });
  wrap.appendChild(el("div", { class: "vlist-foot" }, [add]));

  // Make the list a drop target when its entry type accepts images. Drop N
  // files → append N entries, each with the blob URL written into the right slot.
  const acceptsImages =
    p.entryType.type === "image" ||
    (p.entryType.type === "object" && p.entryType.props.some((sp) => sp.type === "image"));
  if (acceptsImages) {
    attachDropZone(
      wrap,
      (files) => {
        if (files.length === 0) {
          ctx.toast("No image files in drop", "info");
          return;
        }
        for (const file of files) {
          const url = textureLoader.addFile(file);
          arr.push(defaultForProperty(p.entryType));
          applyImageToListEntry(arr, arr.length - 1, p.entryType, url);
        }
        ctx.notifyStructural();
      },
      { stopPropagation: true },
    );
  }

  parent.appendChild(wrap);
}

function renderSubConfig(
  parent: HTMLElement,
  target: Target,
  p: SelectSubConfigProperty,
  ctx: EditorCtx,
): void {
  const dict = dictionaries[p.dictionaryProp];
  if (!dict) return;
  if (!target[p.name]) {
    const first = [...dict.values()][0];
    target[p.name] = first.type;
    target[p.configName] = first.defaultData();
  }

  const tabs = el("div", { class: "tabs" });
  const metas = [...dict.values()];
  for (const meta of metas) {
    const isActive = target[p.name] === meta.type;
    const tab = el(
      "button",
      {
        class: isActive ? "tab active" : "tab",
        type: "button",
      },
      [meta.configSchema.title || meta.type],
    );
    on(tab, "click", () => {
      if (target[p.name] === meta.type) return;
      target[p.name] = meta.type;
      target[p.configName] = meta.defaultData();
      ctx.notifyStructural();
    });
    tabs.appendChild(tab);
  }
  parent.appendChild(makeRow(p.title, tabs, p.description));

  const selected = dict.get(target[p.name] as string);
  if (selected) {
    renderProperty(
      parent,
      target,
      { ...(selected.configSchema as Property), name: p.configName } as Property,
      ctx,
    );
  }
}
