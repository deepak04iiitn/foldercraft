import {
  cloneNode,
  isExplicitDirNode,
  isExplicitFileNode,
  isPlainObject,
} from "../utils/structureHelpers.js";

function splitPath(input) {
  if (typeof input !== "string" || input.trim() === "") {
    return [];
  }
  return input
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);
}

function normalizeDirectoryNode(node) {
  if (!isPlainObject(node)) {
    return {};
  }
  if (isExplicitFileNode(node)) {
    return {};
  }
  if (isExplicitDirNode(node)) {
    return isPlainObject(node.$dir) ? node.$dir : {};
  }
  return node;
}

function ensureParentDir(root, segments) {
  let cursor = root;
  for (const segment of segments) {
    const existing = cursor[segment];
    if (!isPlainObject(existing) || isExplicitFileNode(existing)) {
      cursor[segment] = {};
    } else if (isExplicitDirNode(existing)) {
      cursor[segment] = normalizeDirectoryNode(existing);
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseSetFileSpec(spec) {
  if (typeof spec !== "string" || spec.trim() === "") {
    return null;
  }
  const separator = "::";
  const index = spec.indexOf(separator);
  if (index < 0) {
    return {
      path: spec.trim(),
      content: "",
    };
  }
  return {
    path: spec.slice(0, index).trim(),
    content: spec.slice(index + separator.length),
  };
}

function removePath(root, rawPath, strict, logger) {
  const segments = splitPath(rawPath);
  if (segments.length === 0) {
    if (strict) {
      throw new Error(`Cannot remove invalid path: "${rawPath}".`);
    }
    logger?.warn(`Skipping invalid remove path: "${rawPath}"`);
    return;
  }

  const parentSegments = segments.slice(0, -1);
  const leaf = segments[segments.length - 1];
  let cursor = root;
  for (const segment of parentSegments) {
    if (!isPlainObject(cursor[segment])) {
      if (strict) {
        throw new Error(`Path "${rawPath}" does not exist in generated structure.`);
      }
      logger?.warn(`Path "${rawPath}" does not exist. Skip remove.`);
      return;
    }
    cursor = normalizeDirectoryNode(cursor[segment]);
  }

  if (!Object.prototype.hasOwnProperty.call(cursor, leaf)) {
    if (strict) {
      throw new Error(`Path "${rawPath}" does not exist in generated structure.`);
    }
    logger?.warn(`Path "${rawPath}" does not exist. Skip remove.`);
    return;
  }

  delete cursor[leaf];
  logger?.debug(`Removed path from structure: ${rawPath}`);
}

export function hasCustomizations(customizations = {}) {
  const { addDirs, addFiles, setFiles, removePaths } = customizations;
  return (
    toArray(addDirs).length > 0 ||
    toArray(addFiles).length > 0 ||
    toArray(setFiles).length > 0 ||
    toArray(removePaths).length > 0
  );
}

export function applyCustomizations(baseStructure, customizations = {}, logger) {
  const structure = normalizeDirectoryNode(cloneNode(baseStructure));
  const {
    addDirs = [],
    addFiles = [],
    setFiles = [],
    removePaths = [],
    strictRemove = false,
  } = customizations;

  for (const rawDirPath of toArray(addDirs)) {
    const segments = splitPath(rawDirPath);
    if (segments.length === 0) {
      continue;
    }
    ensureParentDir(structure, segments);
    logger?.debug(`Added directory path: ${rawDirPath}`);
  }

  for (const rawFilePath of toArray(addFiles)) {
    const segments = splitPath(rawFilePath);
    if (segments.length === 0) {
      continue;
    }
    const parent = ensureParentDir(structure, segments.slice(0, -1));
    const leaf = segments[segments.length - 1];
    if (Object.prototype.hasOwnProperty.call(parent, leaf)) {
      logger?.debug(`File already exists in structure: ${rawFilePath}`);
      continue;
    }
    parent[leaf] = "file";
    logger?.debug(`Added empty file path: ${rawFilePath}`);
  }

  for (const rawSpec of toArray(setFiles)) {
    const parsed = parseSetFileSpec(rawSpec);
    if (!parsed) {
      continue;
    }
    const segments = splitPath(parsed.path);
    if (segments.length === 0) {
      continue;
    }
    const parent = ensureParentDir(structure, segments.slice(0, -1));
    const leaf = segments[segments.length - 1];
    parent[leaf] = parsed.content;
    logger?.debug(`Set file content for: ${parsed.path}`);
  }

  for (const rawPath of toArray(removePaths)) {
    removePath(structure, rawPath, strictRemove, logger);
  }

  return structure;
}

