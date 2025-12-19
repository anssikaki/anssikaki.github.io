import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const REPO_NAME = "REPLACE_ME";

export default defineConfig({
  plugins: [react()],
  base: `/${REPO_NAME}/`,
});
