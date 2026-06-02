import type { BehaviorEntry } from "../../src/EmitterConfig";
import { behaviorMetaByType } from "./behaviorRegistry";
import type { EditorCtx } from "./ctx";
import { el, on } from "./dom";
import { renderProperty } from "./propertyControls";

export interface CardDragContext {
  onReorder: (from: number, to: number) => void;
}

const collapsed = new Set<number>();

export function behaviorCard(
  entry: BehaviorEntry,
  index: number,
  total: number,
  ctx: EditorCtx,
  dragCtx: CardDragContext,
  onRemove: () => void,
  onMove: (delta: -1 | 1) => void,
): HTMLElement {
  const meta = behaviorMetaByType.get(entry.type);
  const category = meta?.configSchema.category ?? "other";
  const title = meta?.configSchema.title ?? entry.type;
  const hasBody = meta ? meta.configSchema.props.length > 0 : true;

  const card = el("div", {
    class: collapsed.has(index) ? "card collapsed" : "card",
    "data-cat": category,
    "data-index": String(index),
    draggable: false,
  });
  if (!hasBody) card.classList.add("no-body");

  const drag = el("span", { class: "drag", draggable: true, title: "drag to reorder" }, ["⠿"]);
  const cat = el("div", { class: "card-cat" });
  const titleBox = el("div", { class: "card-title" }, [
    el("span", { class: "name" }, [title]),
    el("span", { class: "type" }, [entry.type]),
  ]);
  const chev = hasBody ? el("span", { class: "card-chev" }, ["▼"]) : null;

  const actions = el("div", { class: "card-actions" });
  if (index > 0) {
    const up = el("button", { title: "move up", type: "button" }, ["↑"]);
    on(up, "click", (ev) => {
      ev.stopPropagation();
      onMove(-1);
    });
    actions.appendChild(up);
  }
  if (index < total - 1) {
    const down = el("button", { title: "move down", type: "button" }, ["↓"]);
    on(down, "click", (ev) => {
      ev.stopPropagation();
      onMove(1);
    });
    actions.appendChild(down);
  }
  const remove = el("button", { class: "danger", title: "remove", type: "button" }, ["✕"]);
  on(remove, "click", (ev) => {
    ev.stopPropagation();
    onRemove();
  });
  actions.appendChild(remove);

  const headerChildren: (HTMLElement | null)[] = [drag, cat, titleBox, chev, actions];
  const header = el(
    "div",
    { class: "card-header" },
    headerChildren.filter((c): c is HTMLElement => c !== null),
  );
  card.appendChild(header);

  if (hasBody) {
    const body = el("div", { class: "card-body" });
    card.appendChild(body);

    on(header, "click", (ev) => {
      if ((ev.target as HTMLElement).closest("button")) return;
      if ((ev.target as HTMLElement).closest(".drag")) return;
      if (collapsed.has(index)) collapsed.delete(index);
      else collapsed.add(index);
      card.classList.toggle("collapsed");
    });

    if (meta) {
      for (const prop of meta.configSchema.props) {
        renderProperty(body, entry.config as Record<string, unknown>, prop, ctx);
      }
    } else {
      body.appendChild(el("div", { class: "label" }, [`(unknown type: ${entry.type})`]));
    }
  }

  wireDrag(card, drag, index, dragCtx);
  return card;
}

function wireDrag(card: HTMLElement, handle: HTMLElement, index: number, dragCtx: CardDragContext) {
  on(handle, "dragstart", (ev) => {
    if (!ev.dataTransfer) return;
    ev.dataTransfer.setData("text/plain", String(index));
    ev.dataTransfer.effectAllowed = "move";
    card.classList.add("drag-source");
  });
  on(handle, "dragend", () => {
    card.classList.remove("drag-source");
  });
  on(card, "dragover", (ev) => {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    const rect = card.getBoundingClientRect();
    const halfway = ev.clientY - rect.top < rect.height / 2;
    card.classList.toggle("drag-over-top", halfway);
    card.classList.toggle("drag-over-bottom", !halfway);
  });
  on(card, "dragleave", () => {
    card.classList.remove("drag-over-top", "drag-over-bottom");
  });
  on(card, "drop", (ev) => {
    ev.preventDefault();
    card.classList.remove("drag-over-top", "drag-over-bottom");
    const from = parseInt(ev.dataTransfer?.getData("text/plain") ?? "", 10);
    if (!Number.isFinite(from) || from === index) return;
    const rect = card.getBoundingClientRect();
    const dropAbove = ev.clientY - rect.top < rect.height / 2;
    let to = dropAbove ? index : index + 1;
    if (from < to) to -= 1;
    if (from !== to) dragCtx.onReorder(from, to);
  });
}
