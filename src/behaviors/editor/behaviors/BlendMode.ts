import { BlendModeBehavior } from "../../BlendMode";

const V8_BLEND_MODE_OPTIONS = [
  "normal",
  "add",
  "multiply",
  "screen",
  "erase",
  "none",
  "min",
  "max",
  "color",
  "color-burn",
  "color-dodge",
  "darken",
  "difference",
  "divide",
  "exclusion",
  "hard-light",
  "hard-mix",
  "lighten",
  "linear-burn",
  "linear-dodge",
  "linear-light",
  "luminosity",
  "negation",
  "overlay",
  "pin-light",
  "saturation",
  "soft-light",
  "subtract",
  "vivid-light",
];

function makeReadable(input: string): string {
  return input
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

BlendModeBehavior.configSchema = {
  category: "blend",
  title: "Blend Mode",
  props: [
    {
      type: "select",
      name: "blendMode",
      title: "Blend Mode",
      description:
        "Blend mode of all particles. Advanced modes (any beyond normal/add/multiply/screen)" +
        " require the BlendModeFilter or an advanced renderer; otherwise they fall back to normal.",
      default: "normal",
      options: V8_BLEND_MODE_OPTIONS.map((value) => ({
        value,
        label: makeReadable(value),
      })),
    },
  ],
};
