import { builtinModules } from "module";
import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
    entry: ["./src/index.ts", "./src/inertia-helpers/index.ts"],
    format: ["cjs", "esm"],
    target: ["esnext"],
    outDir: "dist",
    clean: true,
    dts: true,
    treeshake: true,
    external: [...builtinModules, ...Object.keys(pkg.peerDependencies || {})],
});
