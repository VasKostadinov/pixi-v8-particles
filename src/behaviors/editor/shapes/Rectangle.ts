import { Rectangle } from "../../shapes/Rectangle";

Rectangle.configSchema = {
  type: "object",
  name: "",
  title: "Rectangle",
  description: "A rectangular shape which particles are spawned inside randomly.",
  props: [
    {
      type: "number",
      name: "x",
      title: "X",
      description: "The position of the left edge of the rectangle.",
      default: 0,
    },
    {
      type: "number",
      name: "y",
      title: "Y",
      description: "The position of the top edge of the rectangle.",
      default: 0,
    },
    {
      type: "number",
      name: "w",
      title: "Width",
      description: "The width of the rectangle.",
      default: 10,
    },
    {
      type: "number",
      name: "h",
      title: "Height",
      description: "The height of the rectangle.",
      default: 10,
    },
    {
      type: "boolean",
      name: "edges",
      title: "Edges Only",
      description:
        "If enabled, particles spawn only along the perimeter (frame) of the rectangle instead of inside it.",
      default: false,
    },
  ],
};
