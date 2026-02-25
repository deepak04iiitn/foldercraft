import path from "node:path";
import fs from "fs-extra";
import { isPlainObject, validateNode } from "../utils/structureHelpers.js";

export async function loadCustomTemplate(configPath) {
  if (!configPath) {
    throw new Error("A config file path is required with --config.");
  }

  const resolvedConfigPath = path.resolve(process.cwd(), configPath);
  const exists = await fs.pathExists(resolvedConfigPath);
  if (!exists) {
    throw new Error(`Config file not found: ${resolvedConfigPath}`);
  }

  let parsed;
  try {
    parsed = await fs.readJson(resolvedConfigPath);
  } catch {
    throw new Error(
      `Invalid JSON in config file: ${resolvedConfigPath}. Please provide valid JSON.`,
    );
  }

  if (!isPlainObject(parsed)) {
    throw new Error("Custom config must be a JSON object.");
  }

  validateNode(parsed);
  return parsed;
}

