import { behaviorMetas, type BehaviorMeta } from "./behaviorRegistry";
import { el, on } from "./dom";

export function openAddBehaviorMenu(
  anchor: HTMLElement,
  onPick: (meta: BehaviorMeta) => void,
): void {
  const grouped = new Map<string, BehaviorMeta[]>();
  for (const m of behaviorMetas) {
    const cat = m.configSchema.category;
    const arr = grouped.get(cat) ?? [];
    arr.push(m);
    grouped.set(cat, arr);
  }

  const scrim = el("div", { class: "scrim" });
  const pop = el("div", { class: "popover" });

  for (const [cat, metas] of grouped) {
    pop.appendChild(el("div", { class: "cat" }, [cat]));
    for (const meta of metas) {
      const btn = el("button", { class: "item", type: "button" }, [
        el("span", {}, [meta.configSchema.title]),
        el("span", { class: "type" }, [meta.type]),
      ]);
      on(btn, "click", () => {
        close();
        onPick(meta);
      });
      pop.appendChild(btn);
    }
  }

  const close = () => {
    scrim.remove();
    pop.remove();
    window.removeEventListener("keydown", onKey);
  };
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") close();
  };

  on(scrim, "click", close);
  window.addEventListener("keydown", onKey);

  document.body.appendChild(scrim);
  document.body.appendChild(pop);

  const rect = anchor.getBoundingClientRect();
  pop.style.visibility = "hidden";
  requestAnimationFrame(() => {
    const popRect = pop.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + popRect.width > window.innerWidth - 10)
      left = window.innerWidth - popRect.width - 10;
    if (top + popRect.height > window.innerHeight - 10)
      top = Math.max(10, rect.top - popRect.height - 6);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.style.width = `${rect.width}px`;
    pop.style.visibility = "visible";
  });
}
