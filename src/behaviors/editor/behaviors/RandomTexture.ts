import { RandomTextureBehavior } from "../../RandomTexture";

RandomTextureBehavior.configSchema = {
  category: "art",
  title: "Random Texture",
  props: [
    {
      type: "list",
      name: "textures",
      title: "Particle Textures",
      description: "Images to use for each particle, randomly chosen from the list.",
      entryType: {
        type: "image",
        name: "texture",
        title: "Texture",
        description: "An individual texture in the random list",
      },
    },
  ],
};
