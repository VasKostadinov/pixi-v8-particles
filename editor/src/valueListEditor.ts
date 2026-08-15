import type {
  ColorListProperty,
  NumberListProperty,
} from "../../src/behaviors/BehaviorConfigSchema";
import type { Color } from "../../src/ParticleUtils";
import { PropertyList } from "../../src/PropertyList";
import { PropertyNode } from "../../src/PropertyNode";
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

/**
 * Builds a sampler that returns exactly the color the runtime will put on a
 * particle at a given point in its life.
 *
 * This drives the sampler off the library's own PropertyList rather than
 * reimplementing interpolation here, because the runtime's behavior is full of
 * detail worth not guessing at: a list whose last stop is before time 1
 * extrapolates past that stop instead of holding it, a two-stop list whose
 * second stop is at time >= 1 ignores both stop times and stretches across the
 * whole lifetime, and channels are clamped when they are packed into the tint.
 * Sampling through the real thing is the only way the bar can't drift from what
 * gets exported.
 */
function runtimeSampler(list: ValueListShape<string>): (t: number) => string {
  if (list.list.length === 0) return () => "#ffffff";
  const props = new PropertyList<Color>(true);
  props.reset(
    PropertyNode.createList<string>({
      list: [...list.list].sort((a, b) => a.time - b.time),
      isStepped: list.isStepped,
    }),
  );
  return (t) => "#" + (props.interpolate(t) >>> 0).toString(16).padStart(6, "0");
}

/**
 * Sample count for the interpolated gradient bar. The runtime's curve is
 * piecewise linear, but its corners land wherever a channel saturates during
 * extrapolation, not only on stop times — so the bar samples on a fixed grid
 * (plus every real stop) instead of trying to solve for them.
 */
const GRADIENT_SAMPLES = 32;

function gradientCss(list: ValueListShape<string>): string {
  const sorted = [...list.list].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return "none";
  // Mirror PropertyList.reset's routing: a list only reaches the runtime's
  // stepped interpolator when its second stop is before time 1 — otherwise the
  // "simple" (linear) path wins even with isStepped set, so a stepped 2-stop
  // [0, 1] list actually lerps in game. Draw hard steps only when the runtime
  // will step; everything else falls through to the runtime-driven sampler.
  const steppedAtRuntime = list.isStepped && sorted.length > 1 && sorted[1].time < 1;
  if (steppedAtRuntime) {
    // Stepped lists hold each value until the next stop, and the runtime holds
    // the first and last values outside the stop range — which is also what CSS
    // does with a gradient that starts late or ends early, so plain stops match.
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

  const sample = runtimeSampler(list);
  const times = new Set<number>();
  for (let i = 0; i <= GRADIENT_SAMPLES; i++) times.add(i / GRADIENT_SAMPLES);
  for (const s of sorted) {
    if (s.time > 0 && s.time < 1) times.add(s.time);
  }
  const parts = [...times]
    .sort((a, b) => a - b)
    .map((t) => `${sample(t)} ${(t * 100).toFixed(2)}%`);
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
  list.list.forEach((stop) => {
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
      // Look the stop up by identity rather than the captured index: dragging
      // re-sorts the list underneath the markers, so the index this marker was
      // built with can point at a different stop by now.
      const at = list.list.indexOf(stop);
      if (at >= 0 && list.list.length > 1) {
        list.list.splice(at, 1);
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
      // The runtime walks the stops in array order, so dragging one past
      // another has to re-sort the array or the emitter reads the list
      // differently than the bar draws it. Markers are positioned by `left`,
      // so their DOM order is free to go stale.
      list.list.sort((a, b) => a.time - b.time);
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

/**
 * Color at time `t`, matching the gradient bar and the running emitter — used
 * when clicking the bar inserts a stop, so the new stop doesn't shift the ramp.
 */
function sampleColor(list: ValueListShape<string>, t: number): string {
  return runtimeSampler(list)(t);
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
    // Snapshot of the order the rows were rendered in, so the change handler
    // can tell "a drag crossed another stop" apart from "value nudged in place".
    const renderedOrder = [...list.list];
    list.list.forEach((stop) => {
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
        // Keep the array ordered for the runtime while the slider is live; the
        // rows are only re-sorted on release so the drag doesn't lose the input.
        list.list.sort((a, b) => a.time - b.time);
        ctx.notifyValue();
      });
      // Range inputs fire "change" on every arrow-key step, not just on drag
      // release, and an unconditional refresh would destroy the focused slider
      // after one keypress. Only rebuild when the sort actually reordered the
      // rows — the one case where the DOM is stale.
      on(tSlider, "change", () => {
        if (list.list.some((s, i) => s !== renderedOrder[i])) refresh();
      });
      on(vInput, "input", () => {
        const v = parseFloat(vInput.value);
        if (Number.isFinite(v)) {
          stop.value = v;
          ctx.notifyValue();
        }
      });
      on(del, "click", () => {
        // By identity, not by the captured index — a time slider may have
        // re-sorted the array since this row was built.
        const at = list.list.indexOf(stop);
        if (at >= 0 && list.list.length > 1) {
          list.list.splice(at, 1);
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
