import { ColorBehavior, StaticColorBehavior } from "../../Color";

ColorBehavior.configSchema = {
  category: "color",
  title: "Interpolated Color",
  props: [
    {
      type: "colorList",
      name: "color",
      title: "Color",
      description: "Color of the particles as 6 digit hex codes.",
      default: "#ffffff",
    },
  ],
};

StaticColorBehavior.configSchema = {
  category: "color",
  title: "Static Color",
  props: [
    {
      type: "color",
      name: "color",
      title: "Color",
      description: "Color of the particles as 6 digit hex codes.",
      default: "#ffffff",
    },
  ],
};
