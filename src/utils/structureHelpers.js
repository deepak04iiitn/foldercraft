function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isExplicitFileNode(value) {
  return isPlainObject(value) && hasOwn(value, "$file");
}

function isExplicitDirNode(value) {
  return isPlainObject(value) && hasOwn(value, "$dir");
}

function isFileNode(value) {
  return typeof value === "string" || isExplicitFileNode(value);
}

function isDirNode(value) {
  return isExplicitDirNode(value) || isPlainObject(value);
}

function sanitizeSegment(name, trail) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`Invalid entry name at "${trail || "<root>"}".`);
  }

  if (name.includes("/") || name.includes("\\") || name === "." || name === "..") {
    throw new Error(
      `Invalid path segment "${name}" at "${trail || "<root>"}". Use nested objects for folders.`,
    );
  }
}

function validateFileNode(value, trail) {
  if (typeof value === "string") {
    return;
  }

  const content = value.$file;
  if (!(typeof content === "string" || content === null)) {
    throw new Error(
      `Invalid $file value at "${trail}". Use a string for content or null for empty file.`,
    );
  }
}

function normalizeDirChildren(value) {
  if (isExplicitDirNode(value)) {
    return value.$dir;
  }
  return value;
}

function validateNode(node, trail = "") {
  if (isFileNode(node)) {
    validateFileNode(node, trail || "<root-file>");
    return;
  }

  if (!isPlainObject(node)) {
    throw new Error(
      `Invalid structure node at "${trail || "<root>"}". Use {}, "file", string content, {$file}, or {$dir}.`,
    );
  }

  if (isExplicitDirNode(node) && !isPlainObject(node.$dir)) {
    throw new Error(`Invalid $dir value at "${trail || "<root>"}". It must be an object.`);
  }

  if (isExplicitFileNode(node) && Object.keys(node).length > 1) {
    throw new Error(`File node at "${trail}" must only contain the "$file" key.`);
  }

  if (isExplicitDirNode(node) && Object.keys(node).length > 1) {
    throw new Error(`Directory node at "${trail || "<root>"}" must only contain the "$dir" key.`);
  }

  const children = normalizeDirChildren(node);
  if (!isPlainObject(children)) {
    throw new Error(`Directory node at "${trail || "<root>"}" must be an object.`);
  }

  for (const [name, value] of Object.entries(children)) {
    sanitizeSegment(name, trail);
    const childTrail = trail ? `${trail}/${name}` : name;
    validateNode(value, childTrail);
  }
}

function cloneNode(node) {
  if (typeof node === "string") {
    return node;
  }

  if (isExplicitFileNode(node)) {
    return { $file: node.$file };
  }

  if (isExplicitDirNode(node)) {
    return { $dir: cloneNode(node.$dir) };
  }

  if (!isPlainObject(node)) {
    return node;
  }

  const cloned = {};
  for (const [key, value] of Object.entries(node)) {
    cloned[key] = cloneNode(value);
  }
  return cloned;
}

function mergeNodes(baseNode, extensionNode) {
  if (baseNode === undefined) {
    return cloneNode(extensionNode);
  }

  if (extensionNode === undefined) {
    return cloneNode(baseNode);
  }

  if (isFileNode(baseNode) || isFileNode(extensionNode)) {
    return cloneNode(extensionNode);
  }

  const baseChildren = normalizeDirChildren(baseNode);
  const extensionChildren = normalizeDirChildren(extensionNode);
  const merged = {};

  const keys = new Set([...Object.keys(baseChildren), ...Object.keys(extensionChildren)]);
  for (const key of keys) {
    merged[key] = mergeNodes(baseChildren[key], extensionChildren[key]);
  }
  return merged;
}

export {
  isPlainObject,
  isExplicitFileNode,
  isExplicitDirNode,
  isFileNode,
  isDirNode,
  validateNode,
  cloneNode,
  mergeNodes,
};

