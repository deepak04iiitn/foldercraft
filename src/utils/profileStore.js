import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

const PROFILE_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const PROFILES_FILE_NAME = "profiles.json";
const DEFAULT_PROFILE_DIR = ".foldercraft";
const LEGACY_PROFILE_DIR = ".foldr";

function validateProfileName(name) {
  if (!name || typeof name !== "string" || !PROFILE_NAME_REGEX.test(name)) {
    throw new Error(
      "Invalid profile name. Use 1-64 chars with letters, numbers, '-' or '_'.",
    );
  }
}

function getDefaultProfilesPath() {
  return path.join(os.homedir(), DEFAULT_PROFILE_DIR, PROFILES_FILE_NAME);
}

function getLegacyProfilesPath() {
  return path.join(os.homedir(), LEGACY_PROFILE_DIR, PROFILES_FILE_NAME);
}

async function resolveReadStorePath(storePath) {
  if (storePath) {
    return storePath;
  }

  const defaultPath = getDefaultProfilesPath();
  if (await fs.pathExists(defaultPath)) {
    return defaultPath;
  }

  const legacyPath = getLegacyProfilesPath();
  if (await fs.pathExists(legacyPath)) {
    return legacyPath;
  }

  return defaultPath;
}

async function resolveWriteStorePath(storePath) {
  if (storePath) {
    return storePath;
  }

  const defaultPath = getDefaultProfilesPath();
  if (await fs.pathExists(defaultPath)) {
    return defaultPath;
  }

  const legacyPath = getLegacyProfilesPath();
  if (await fs.pathExists(legacyPath)) {
    await fs.ensureDir(path.dirname(defaultPath));
    await fs.move(legacyPath, defaultPath, { overwrite: false });
  }

  return defaultPath;
}

async function readRawProfiles(storePath) {
  const filePath = await resolveReadStorePath(storePath);
  const exists = await fs.pathExists(filePath);
  if (!exists) {
    return {};
  }

  let data;
  try {
    data = await fs.readJson(filePath);
  } catch {
    throw new Error(`Profile store is corrupted: ${filePath}`);
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`Profile store has invalid format: ${filePath}`);
  }

  return data;
}

async function writeRawProfiles(profiles, storePath) {
  const filePath = await resolveWriteStorePath(storePath);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, profiles, { spaces: 2 });
}

function sanitizeGenerationOptions(options = {}) {
  const {
    framework,
    path: targetPath,
    config,
    overwrite,
    merge,
    extend,
    empty,
    dryRun,
    addDir,
    addFile,
    setFile,
    remove,
    strict,
    verbose,
  } = options;

  const sanitized = {
    framework,
    path: targetPath,
    config,
    overwrite: Boolean(overwrite),
    merge: Boolean(merge),
    extend: Boolean(extend),
    empty: Boolean(empty),
    dryRun: Boolean(dryRun),
    strict: Boolean(strict),
    verbose: Boolean(verbose),
  };

  if (Array.isArray(addDir) && addDir.length > 0) {
    sanitized.addDir = [...new Set(addDir)];
  }
  if (Array.isArray(addFile) && addFile.length > 0) {
    sanitized.addFile = [...new Set(addFile)];
  }
  if (Array.isArray(setFile) && setFile.length > 0) {
    sanitized.setFile = [...new Set(setFile)];
  }
  if (Array.isArray(remove) && remove.length > 0) {
    sanitized.remove = [...new Set(remove)];
  }

  return Object.fromEntries(
    Object.entries(sanitized).filter(([, value]) => value !== undefined),
  );
}

async function saveProfile(name, options, storePath) {
  validateProfileName(name);
  const profiles = await readRawProfiles(storePath);
  profiles[name] = sanitizeGenerationOptions(options);
  await writeRawProfiles(profiles, storePath);
}

async function loadProfile(name, storePath) {
  validateProfileName(name);
  const profiles = await readRawProfiles(storePath);
  if (!Object.prototype.hasOwnProperty.call(profiles, name)) {
    throw new Error(`Profile "${name}" not found.`);
  }
  return profiles[name];
}

async function listProfiles(storePath) {
  const profiles = await readRawProfiles(storePath);
  return Object.keys(profiles).sort();
}

async function removeProfile(name, storePath) {
  validateProfileName(name);
  const profiles = await readRawProfiles(storePath);
  if (!Object.prototype.hasOwnProperty.call(profiles, name)) {
    throw new Error(`Profile "${name}" not found.`);
  }
  delete profiles[name];
  await writeRawProfiles(profiles, storePath);
}

export {
  getDefaultProfilesPath,
  sanitizeGenerationOptions,
  saveProfile,
  loadProfile,
  listProfiles,
  removeProfile,
};

