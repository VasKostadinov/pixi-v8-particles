import type {
  ListProperty,
  ObjectProperty,
  Property,
  SelectSubConfigProperty,
} from "../../src/behaviors/editor/Types";
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

type Target = Record<string, unknown>;

export function renderProperty(
  parent: HTMLElement,
  target: Target,
  prop: Property,
  ctx: EditorCtx,
): void {
  switch (prop.type) {
    case "number":
      parent.appendChild(
        makeRow(prop.title, numberControl(target, prop, ctx), prop.description),
      );
      return;
    case "color":
      parent.appendChild(
        makeRow(prop.title, colorControl(target, prop, ctx), prop.description),
      );
      return;
    case "boolean":
      parent.appendChild(
        makeRow(prop.title, booleanControl(target, prop, ctx), prop.description),
      );
      return;
    case "text":
      parent.appendChild(
        makeRow(prop.title, textControl(target, prop, ctx), prop.description),
      );
      return;
    case "image":
      parent.appendChild(
        makeRow(prop.title, imageControl(target, prop, ctx), prop.description),
      );
      return;
    case "select":
      parent.appendChild(
        makeRow(prop.title, selectControl(target, prop, ctx), prop.description),
      );
      return;
    case "point":
      parent.appendChild(
        makeRow(prop.title, pointControl(target, prop, ctx), prop.description),
      );
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
    p.name === ""
      ? target
      : ((target[key] ??= buildDefault(p.props)), target[key] as Target);
  if (p.title && p.name) {
    parent.appendChild(
      el("div", { class: "section-title", style: "margin-top:4px" }, [p.title]),
    );
  }
  for (const sp of p.props) renderProperty(parent, obj, sp, ctx);
}

function renderList(
  parent: HTMLElement,
  target: Target,
  p: ListProperty,
  ctx: EditorCtx,
): void {
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
    const control = el("div", { class: "control", style: "flex-direction:column; align-items:stretch; gap:6px" });
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
    const tab = el("button", {
      class: isActive ? "tab active" : "tab",
      type: "button",
    }, [meta.editorConfig.title || meta.type]);
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
      { ...(selected.editorConfig as Property), name: p.configName } as Property,
      ctx,
    );
  }
}
