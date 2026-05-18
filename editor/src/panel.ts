import type { EmitterConfigV3 } from "../../src/EmitterConfig";
import { behaviorCard } from "./behaviorCard";
import { openAddBehaviorMenu } from "./addBehaviorMenu";
import type { EditorCtx } from "./ctx";
import { clear, el, on } from "./dom";
import { booleanControl, makeRow, numberControl, pointControl } from "./controls";

export function renderPanel(scroll: HTMLElement, config: EmitterConfigV3, ctx: EditorCtx): void {
  clear(scroll);

  // --- Emitter section
  const emitterCard = el("div", { class: "card", "data-cat": "other" });
  const emitterHeader = el("div", { class: "card-header" }, [
    el("div", { class: "card-cat" }),
    el("div", { class: "card-title" }, [
      el("span", { class: "name" }, ["Emitter"]),
      el("span", { class: "type" }, ["EmitterConfigV3"]),
    ]),
  ]);
  const emitterBody = el("div", { class: "card-body" });
  emitterCard.appendChild(emitterHeader);
  emitterCard.appendChild(emitterBody);

  emitterBody.appendChild(
    makeRow(
      "Lifetime min",
      numberControl(
        config.lifetime as unknown as Record<string, unknown>,
        {
          type: "number",
          name: "min",
          title: "min",
          description: "min lifetime (s)",
          default: 0.5,
          min: 0,
          max: 10,
        },
        ctx,
      ),
      "Minimum particle lifetime, in seconds",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Lifetime max",
      numberControl(
        config.lifetime as unknown as Record<string, unknown>,
        {
          type: "number",
          name: "max",
          title: "max",
          description: "max lifetime (s)",
          default: 1,
          min: 0,
          max: 10,
        },
        ctx,
      ),
      "Maximum particle lifetime, in seconds",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Frequency",
      numberControl(
        config as unknown as Record<string, unknown>,
        {
          type: "number",
          name: "frequency",
          title: "frequency",
          description: "seconds between waves",
          default: 0.01,
          min: 0.001,
          max: 2,
        },
        ctx,
      ),
      "How often to spawn particles (seconds)",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Per wave",
      numberControl(
        config as unknown as Record<string, unknown>,
        {
          type: "number",
          name: "particlesPerWave",
          title: "per wave",
          description: "particles per spawn",
          default: 1,
          min: 1,
          max: 100,
        },
        ctx,
      ),
      "Particles spawned per wave",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Spawn chance",
      numberControl(
        config as unknown as Record<string, unknown>,
        {
          type: "number",
          name: "spawnChance",
          title: "chance",
          description: "0..1 chance of spawn per wave",
          default: 1,
          min: 0,
          max: 1,
        },
        ctx,
      ),
      "Chance to spawn at all (0..1)",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Emitter life",
      numberControl(
        config as unknown as Record<string, unknown>,
        {
          type: "number",
          name: "emitterLifetime",
          title: "emitter life",
          description: "-1 = forever",
          default: -1,
        },
        ctx,
      ),
      "Total emitter lifetime, -1 for infinite",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Max particles",
      numberControl(
        config as unknown as Record<string, unknown>,
        {
          type: "number",
          name: "maxParticles",
          title: "max",
          description: "cap on alive particles",
          default: 200,
          min: 1,
          max: 5000,
        },
        ctx,
      ),
      "Maximum number of alive particles",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Position",
      pointControl(
        config as unknown as Record<string, unknown>,
        {
          type: "point",
          name: "pos",
          title: "pos",
          description: "spawn position offset",
          default: { x: 0, y: 0 },
        },
        ctx,
      ),
      "Emitter spawn position offset",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Add at back",
      booleanControl(
        config as unknown as Record<string, unknown>,
        {
          type: "boolean",
          name: "addAtBack",
          title: "addAtBack",
          description: "spawn behind existing children",
          default: false,
        },
        ctx,
      ),
      "Spawn particles behind existing display children",
    ),
  );
  emitterBody.appendChild(
    makeRow(
      "Emit",
      booleanControl(
        config as unknown as Record<string, unknown>,
        {
          type: "boolean",
          name: "emit",
          title: "emit",
          description: "actively emit particles",
          default: true,
        },
        ctx,
      ),
      "Actively emit particles",
    ),
  );

  const emitterSection = el("section", { class: "section" });
  emitterSection.appendChild(emitterCard);
  scroll.appendChild(emitterSection);

  // --- Behaviors section
  const behaviorsSection = el("section", { class: "section" });
  behaviorsSection.appendChild(
    el("h3", { class: "section-title" }, [
      el("span", {}, ["Behaviors"]),
      el("span", {}, [`${config.behaviors.length}`]),
    ]),
  );

  const addBtn = el("button", { class: "add-btn", type: "button" }, ["+ Add behavior"]);
  on(addBtn, "click", () => {
    openAddBehaviorMenu(addBtn, (meta) => {
      config.behaviors.push({ type: meta.type, config: meta.defaultConfig() });
      ctx.notifyStructural();
    });
  });
  behaviorsSection.appendChild(el("div", { class: "add-row" }, [addBtn]));

  config.behaviors.forEach((entry, i) => {
    const card = behaviorCard(
      entry,
      i,
      config.behaviors.length,
      ctx,
      {
        onReorder: (from, to) => {
          const [item] = config.behaviors.splice(from, 1);
          config.behaviors.splice(to, 0, item);
          ctx.notifyStructural();
        },
      },
      () => {
        config.behaviors.splice(i, 1);
        ctx.notifyStructural();
      },
      (delta) => {
        const j = i + delta;
        if (j < 0 || j >= config.behaviors.length) return;
        const tmp = config.behaviors[j];
        config.behaviors[j] = config.behaviors[i];
        config.behaviors[i] = tmp;
        ctx.notifyStructural();
      },
    );
    behaviorsSection.appendChild(card);
  });

  scroll.appendChild(behaviorsSection);
}
