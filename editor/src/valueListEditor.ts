import type {
  ColorListProperty,
  NumberListProperty,
} from "../../src/behaviors/BehaviorConfigSchema";
import type { EditorCtx } from "./ctx";
import { el, on } from "./dom";
import { booleanEl } from "./controls";

type Target = Record<string, unknown>;

interface ValueListShape<T> {
  list: { time: number; value: T }[];
  isStepped?: boolean;
}

function ensureList<T>(target: Target, key: string, defaultValue: T): ValueListShape<T> {
  let list = target[key] as ValueListShape<T> | undefined;
  if (!list || !Array.isArray(list.list)) {
    list = {
      list: [
        { time: 0, value: defaultValue },
        { time: 1, value: defaultValue },
      ],
    };
    target[key] = list;
  }
  if (list.isStepped === undefined) list.isStepped = false;
  return list;
}

function normalizeHex(value: string): string {
  if (!value) return "#ffffff";
  let v = value.trim();
  if (!v.startsWith("#")) v = "#" + v;
  if (!/^#[0-9a-fA-F]{6}$/.test(v)) return "#ffffff";
  return v.toLowerCase();
}

/* ---------- color list (gradient) ---------- */

export function colorListControl(
  target: Target,
  p: ColorListProperty,
  ctx: EditorCtx,
): HTMLElement {
  const list = ensureList<string>(target, p.name, normalizeHex(p.default));
  list.list.sort((a, b) => a.time - b.time);

  const wrap = el("div", { class: "vlist" });
  wrap.appendChild(makeHeader(p.title, list, ctx));

  const grad = el("div", { class: "grad" });
  const fill = el("div", { class: "grad-fill" });
  grad.appendChild(fill);
  wrap.appendChild(grad);

  const track = el("div", { class: "grad-marker-track" });
  wrap.appendChild(track);

  // Cheap update: just repaint the gradient bar. Used during drag so the
  // marker DOM stays put and the pointer capture keeps working.
  const updateGradient = () => {
    fill.style.background = gradientCss(list);
  };
  // Structural rebuild: re-renders all markers. Only used when stops are
  // added or removed.
  const rebuildMarkers = () => {
    list.list.sort((a, b) => a.time - b.time);
    renderMarkers(track, list, ctx, updateGradient, rebuildMarkers);
    updateGradient();
  };
  rebuildMarkers();

  on(grad, "click", (ev) => {
    if ((ev.target as HTMLElement).closest(".grad-marker")) return;
    const rect = grad.getBoundingClientRect();
    const t = clamp01((ev.clientX - rect.left) / rect.width);
    const value = sampleColor(list, t);
    list.list.push({ time: t, value });
    rebuildMarkers();
    ctx.notifyValue();
  });

  wrap.appendChild(
    makeFooter(
      list,
      () => {
        list.list.push({ time: 1, value: list.list[list.list.length - 1]?.value ?? "#ffffff" });
        rebuildMarkers();
        ctx.notifyValue();
      },
      ctx,
    ),
  );

  return wrap;
}

function gradientCss(list: ValueListShape<string>): string {
  const sorted = [...list.list].sort((a, b) => a.time - b.time);
  if (list.isStepped) {
    const parts: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      const next = sorted[i + 1];
      const startPct = (s.time * 100).toFixed(2) + "%";
      const endPct = ((next ? next.time : 1) * 100).toFixed(2) + "%";
      parts.push(`${s.value} ${startPct}`, `${s.value} ${endPct}`);
    }
    return `linear-gradient(to right, ${parts.join(", ")})`;
  }
  const parts = sorted.map((s) => `${s.value} ${(s.time * 100).toFixed(2)}%`);
  return `linear-gradient(to right, ${parts.join(", ")})`;
}

function renderMarkers(
  track: HTMLElement,
  list: ValueListShape<string>,
  ctx: EditorCtx,
  updateGradient: () => void,
  rebuildMarkers: () => void,
) {
  track.innerHTML = "";
  list.list.forEach((stop, index) => {
    const m = el("div", {
      class: "grad-marker",
      style: `left:${(stop.time * 100).toFixed(2)}%; --c:${stop.value}`,
      title: `time ${stop.time.toFixed(2)} · click to pick color · drag to move · right-click to delete`,
    });
    // Hidden picker — must stay in the DOM so .click() opens the native dialog,
    // but it must NOT intercept pointer events on the marker (which would steal
    // pointerdown and trigger the native dialog before drag can start).
    const picker = el("input", { type: "color", value: stop.value });
    m.appendChild(picker);
    on(picker, "input", () => {
      stop.value = normalizeHex(picker.value);
      m.style.setProperty("--c", stop.value);
      updateGradient();
      ctx.notifyValue();
    });
    on(m, "contextmenu", (ev) => {
      ev.preventDefault();
      if (list.list.length > 1) {
        list.list.splice(index, 1);
        rebuildMarkers();
        ctx.notifyValue();
      }
    });

    let dragging = false;
    let didDrag = false;
    let startX = 0;
    on(m, "pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      dragging = true;
      didDrag = false;
      startX = ev.clientX;
      m.classList.add("dragging");
      m.setPointerCapture(ev.pointerId);
    });
    on(m, "pointermove", (ev) => {
      if (!dragging) return;
      if (!didDrag && Math.abs(ev.clientX - startX) < 3) return;
      didDrag = true;
      const rect = track.getBoundingClientRect();
      const t = clamp01((ev.clientX - rect.left) / rect.width);
      stop.time = t;
      m.style.left = `${(t * 100).toFixed(2)}%`;
      updateGradient();
      ctx.notifyValue();
    });
    on(m, "pointerup", (ev) => {
      if (!dragging) return;
      dragging = false;
      m.classList.remove("dragging");
      m.releasePointerCapture(ev.pointerId);
      if (!didDrag) picker.click();
    });

    track.appendChild(m);
  });
}

function sampleColor(list: ValueListShape<string>, t: number): string {
  const sorted = [...list.list].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return "#ffffff";
  if (t <= sorted[0].time) return sorted[0].value;
  if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.time && t <= b.time) {
      const span = b.time - a.time;
      const f = span === 0 ? 0 : (t - a.time) / span;
      return lerpHex(a.value, b.value, f);
    }
  }
  return sorted[0].value;
}

function lerpHex(a: string, b: string, f: number): string {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  const r = Math.round(ar.r + (br.r - ar.r) * f);
  const g = Math.round(ar.g + (br.g - ar.g) * f);
  const bl = Math.round(ar.b + (br.b - ar.b) * f);
  return "#" + [r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

/* ---------- number list (rows) ---------- */

export function numberListControl(
  target: Target,
  p: NumberListProperty,
  ctx: EditorCtx,
): HTMLElement {
  const list = ensureList<number>(target, p.name, p.default);
  list.list.sort((a, b) => a.time - b.time);

  const wrap = el("div", { class: "vlist" });
  wrap.appendChild(makeHeader(p.title, list, ctx));

  const headers = el("div", { class: "num-stop num-stop-head" }, [
    el("span", { class: "t time-h" }, ["time"]),
    el("span", { class: "t value-h" }, ["value"]),
  ]);
  wrap.appendChild(headers);

  const stopsWrap = el("div", { class: "num-stops" });
  wrap.appendChild(stopsWrap);

  const minV = p.min ?? 0;
  const maxV =
    p.max ??
    guessMax(
      list.list.map((s) => s.value),
      p.default,
    );

  const refresh = () => {
    list.list.sort((a, b) => a.time - b.time);
    stopsWrap.innerHTML = "";
    list.list.forEach((stop, index) => {
      const row = el("div", { class: "num-stop" });
      row.appendChild(el("span", { class: "t" }, [stop.time.toFixed(2)]));
      const tSlider = el("input", {
        type: "range",
        class: "slider",
        min: 0,
        max: 1,
        step: 0.01,
        value: String(stop.time),
      });
      const vInput = el("input", {
        type: "number",
        class: "input num",
        step: "any",
        value: String(stop.value),
      });
      vInput.style.width = "100%";
      const del = el(
        "button",
        {
          class: "btn-mini danger",
          title: "remove stop",
        },
        ["×"],
      );
      del.disabled = list.list.length <= 1;

      on(tSlider, "input", () => {
        stop.time = parseFloat(tSlider.value);
        (row.firstChild as HTMLElement).textContent = stop.time.toFixed(2);
        ctx.notifyValue();
      });
      on(vInput, "input", () => {
        const v = parseFloat(vInput.value);
        if (Number.isFinite(v)) {
          stop.value = v;
          ctx.notifyValue();
        }
      });
      on(del, "click", () => {
        if (list.list.length > 1) {
          list.list.splice(index, 1);
          refresh();
          ctx.notifyValue();
        }
      });
      row.appendChild(tSlider);
      row.appendChild(vInput);
      row.appendChild(del);
      stopsWrap.appendChild(row);
    });
  };
  refresh();
  // Suppress unused-var warnings while reserving the min/max for future use
  void minV;
  void maxV;

  wrap.appendChild(
    makeFooter(
      list,
      () => {
        const last = list.list[list.list.length - 1];
        list.list.push({
          time: Math.min(1, (last?.time ?? 0) + 0.1),
          value: last?.value ?? p.default,
        });
        refresh();
        ctx.notifyValue();
      },
      ctx,
    ),
  );

  return wrap;
}

function guessMax(values: number[], fallback: number): number {
  const max = Math.max(...values, fallback);
  return max <= 0 ? 1 : max * 2;
}

/* ---------- shared header / footer ---------- */

function makeHeader(title: string, list: ValueListShape<unknown>, ctx: EditorCtx): HTMLElement {
  const head = el("div", { class: "vlist-title" });
  head.appendChild(el("span", {}, [title]));
  const meta = el("div", { class: "meta" });
  meta.appendChild(el("span", {}, ["stepped"]));
  meta.appendChild(
    booleanEl(!!list.isStepped, (v) => {
      list.isStepped = v;
      ctx.notifyValue();
    }),
  );
  head.appendChild(meta);
  return head;
}

function makeFooter(
  list: ValueListShape<unknown>,
  onAdd: () => void,
  _ctx: EditorCtx,
): HTMLElement {
  const foot = el("div", { class: "vlist-foot" });
  const add = el("button", { class: "btn-mini" }, ["+ add stop"]);
  on(add, "click", onAdd);
  foot.appendChild(add);
  const count = el("span", { class: "meta" }, [`${list.list.length} stops`]);
  foot.appendChild(count);
  return foot;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
