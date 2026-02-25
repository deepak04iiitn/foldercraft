import path from "node:path";
import fs from "fs-extra";
import {
  isExplicitDirNode,
  isExplicitFileNode,
  isPlainObject,
  validateNode,
} from "../utils/structureHelpers.js";

function getFileContent(value) {
  if (typeof value === "string") {
    return value === "file" ? "" : value;
  }
  if (isExplicitFileNode(value)) {
    return typeof value.$file === "string" ? value.$file : "";
  }
  return null;
}

function getDirChildren(value) {
  if (isExplicitDirNode(value)) {
    return value.$dir;
  }
  return value;
}

export async function buildFileTree(
  structure,
  rootPath,
  logger,
  { dryRun = false, fileWritePolicy = "overwrite" } = {},
) {
  validateNode(structure);

  const entries = Object.entries(structure);
  for (const [name, value] of entries) {
    const itemPath = path.join(rootPath, name);
    const fileContent = getFileContent(value);

    if (fileContent !== null) {
      const exists = await fs.pathExists(itemPath);
      if (exists && fileWritePolicy === "skip") {
        logger?.debug(`Skipped existing file: ${itemPath}`);
        continue;
      }

      if (dryRun) {
        logger?.info(`[dry-run] Create file: ${itemPath}`);
        continue;
      }

      await fs.ensureFile(itemPath);
      await fs.writeFile(itemPath, fileContent);
      logger?.debug(`Created file: ${itemPath}`);
      continue;
    }

    if (isPlainObject(value)) {
      const childTree = getDirChildren(value);
      if (!isPlainObject(childTree)) {
        throw new Error(`Invalid directory value for "${name}".`);
      }

      if (dryRun) {
        logger?.info(`[dry-run] Create dir: ${itemPath}`);
      } else {
        await fs.ensureDir(itemPath);
        logger?.debug(`Created dir: ${itemPath}`);
      }

      await buildFileTree(childTree, itemPath, logger, {
        dryRun,
        fileWritePolicy,
      });
      continue;
    }

    throw new Error(
      `Invalid value for "${name}". Use {}, "file", string content, {$file}, or {$dir}.`,
    );
  }
}

