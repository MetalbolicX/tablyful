"use strict";

import { readdir, rename, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);
const sourceRoot = join(projectRoot, "src");

/**
 * Recursively lists files under a directory.
 * @param {string} rootDir
 * @returns {Promise<string[]>}
 */
const listFilesRecursively = async rootDir => {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursively(absolutePath);
      }
      return [absolutePath];
    }),
  );
  return files.flat();
};

/**
 * Renames all generated .gen.tsx files to .gen.ts.
 * @returns {Promise<void>}
 */
const renameGeneratedTypes = async () => {
  const allFiles = await listFilesRecursively(sourceRoot);
  const generatedTsxFiles = allFiles.filter(filePath => filePath.endsWith(".gen.tsx"));

  await Promise.all(
    generatedTsxFiles.map(async sourcePath => {
      const targetPath = sourcePath.replace(/\.gen\.tsx$/, ".gen.ts");

      await unlink(targetPath).catch(() => undefined);
      await rename(sourcePath, targetPath);
    }),
  );

  const renamedCount = generatedTsxFiles.length;
  console.log(`Renamed ${renamedCount} genType files from .tsx to .ts.`);
};

await renameGeneratedTypes();
