import path from "node:path";
import fs from "fs-extra";
import {
  isExplicitDirNode,
  isExplicitFileNode,
  isPlainObject,
  validateNode,
} from "../utils/structureHelpers.js";

const DIRECTORY_HINTS = {
  src: "Keep core source code files and feature modules in this directory.",
  components: "Store reusable UI components and their related files here.",
  hooks: "Place reusable custom hooks in this directory.",
  pages: "Add route-level page files for your application here.",
  public: "Keep static public assets such as images and icons in this directory.",
  services: "Store service-layer logic and external API integrations here.",
  routes: "Place route definitions and route handlers in this directory.",
  models: "Store data models and schema files in this directory.",
  utils: "Keep utility/helper functions used across the project here.",
  tests: "Add test files and test helpers for this project in this directory.",
  docs: "Store project documentation and reference files in this directory.",
};

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

function hasReadmeNode(tree) {
  return Object.keys(tree).some((key) => key.toLowerCase() === "readme.md");
}

function toTitleCase(value) {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildDirectoryReadme(dirPath, relativeDirPath) {
  const rawName = path.basename(dirPath);
  const name = toTitleCase(rawName);
  const hint = DIRECTORY_HINTS[rawName.toLowerCase()];
  const scope = relativeDirPath
    ? `Directory path: ${relativeDirPath.replaceAll("\\", "/")}`
    : "Directory path: project root";
  const description = hint ?? "Keep files in this directory focused on this folder's purpose.";
  return `# ${name}\n${scope}\n${description}\n`;
}

async function ensureDirectoryReadme(
  structure,
  rootPath,
  relativePath,
  logger,
  { dryRun = false, fileWritePolicy = "overwrite" } = {},
) {
  if (hasReadmeNode(structure)) {
    return;
  }

  const readmePath = path.join(rootPath, "README.md");
  const exists = await fs.pathExists(readmePath);
  if (exists && fileWritePolicy === "skip") {
    logger?.debug(`Skipped existing file: ${readmePath}`);
    return;
  }

  if (dryRun) {
    logger?.info(`[dry-run] Create file: ${readmePath}`);
    return;
  }

  await fs.ensureFile(readmePath);
  await fs.writeFile(readmePath, buildDirectoryReadme(rootPath, relativePath));
  logger?.debug(`Created file: ${readmePath}`);
}

export async function buildFileTree(
  structure,
  rootPath,
  logger,
  { dryRun = false, fileWritePolicy = "overwrite", relativePath = "" } = {},
) {
  validateNode(structure);
  await ensureDirectoryReadme(structure, rootPath, relativePath, logger, {
    dryRun,
    fileWritePolicy,
  });

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
        relativePath: path.join(relativePath, name),
      });
      continue;
    }

    throw new Error(
      `Invalid value for "${name}". Use {}, "file", string content, {$file}, or {$dir}.`,
    );
  }
}

