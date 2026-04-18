"use strict";
import { defineConfig } from "rolldown";
import { join } from "node:path";
import { minify } from "rollup-plugin-esbuild";
import pkg from "./package.json" with { type: "json" };

const dirname = import.meta.dirname ?? ".";

const shared = {
  platform: "node",
  plugins: [minify()],
  external: [
    /^node:.*/, // all node: built-ins (node:fs, node:url, etc.)
    /^@rescript\/runtime(\/.*)?$/, // ReScript runtime (including subpath imports)
    /^stream-json(\/.*)?$/, // stream-json and its internal submodules
    /^unified$/, // unified processor
    /^rehype-parse$/, // HTML parser
    /^remark-parse$/, // Markdown parser
    /^remark-gfm$/, // GFM (tables) support
    /^hast-util-to-text$/, // HAST text extraction
    /^mdast-util-gfm-table$/, // mdast GFM table utilities
    /^yaml$/, // YAML parser
    /^fast-xml-parser$/, // XML parser
  ],
  transform: {
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
  },
};

export default defineConfig([
  {
    ...shared,
    input: join(dirname, "src", "Cli", "CliMain.res.mjs"),
    output: {
      format: "es",
      file: join(dirname, "dist", "cli.mjs"),
      banner: "#!/usr/bin/env node",
      footer: "\nmain();",
    },
    plugins: [],
  },
]);
