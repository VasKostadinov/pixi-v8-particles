import { VelocityRotationBehavior } from "../../VelocityRotation";

VelocityRotationBehavior.configSchema = {
  category: "rotation",
  title: "Align Rotation to Velocity",
  props: [
    {
      type: "number",
      name: "offset",
      title: "Angle Offset",
      description:
        "Degrees added to the velocity angle. Use 90 if the sprite art points up instead of right.",
      default: 0,
    },
  ],
};
