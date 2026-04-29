import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        character: resolve(__dirname, "character.html"),
        episodeCharacters: resolve(__dirname, "episode-characters.html"),
        map: resolve(__dirname, "map.html"),
      },
    },
  },
})
