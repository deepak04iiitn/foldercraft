#!/usr/bin/env node
import { Command } from "commander";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { runFoldr } from "./index.js";
import { createLogger } from "./utils/logger.js";
import {
  getDefaultProfilesPath,
  listProfiles,
  loadProfile,
  removeProfile,
  saveProfile,
  sanitizeGenerationOptions,
} from "./utils/profileStore.js";

const program = new Command();

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function mergeOptions(base, overrides) {
  const merged = { ...base, ...overrides };
  merged.addDir = dedupe([...toArray(base.addDir), ...toArray(overrides.addDir)]);
  merged.addFile = dedupe([...toArray(base.addFile), ...toArray(overrides.addFile)]);
  merged.setFile = dedupe([...toArray(base.setFile), ...toArray(overrides.setFile)]);
  merged.remove = dedupe([...toArray(base.remove), ...toArray(overrides.remove)]);
  return merged;
}

function applyCliOverrides(profileOptions, cliOptions, command) {
  const merged = { ...profileOptions };
  for (const key of Object.keys(cliOptions)) {
    if (key === "addDir" || key === "addFile" || key === "setFile" || key === "remove") {
      continue;
    }
    const source = command.getOptionValueSource(key);
    if (source && source !== "default") {
      merged[key] = cliOptions[key];
    }
  }
  return mergeOptions(merged, {
    addDir: toArray(cliOptions.addDir),
    addFile: toArray(cliOptions.addFile),
    setFile: toArray(cliOptions.setFile),
    remove: toArray(cliOptions.remove),
  });
}

async function askYesNo(rl, question, defaultValue = false) {
  const suffix = defaultValue ? " (Y/n): " : " (y/N): ";
  const answer = (await rl.question(`${question}${suffix}`)).trim().toLowerCase();
  if (answer === "") {
    return defaultValue;
  }
  return /^y(es)?$/.test(answer);
}

async function askText(rl, question, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`${question}${suffix}: `);
  const trimmed = answer.trim();
  return trimmed === "" ? defaultValue : trimmed;
}

async function askRepeat(rl, label) {
  const values = [];
  while (true) {
    const value = (await rl.question(`${label} (leave blank to stop): `)).trim();
    if (!value) {
      break;
    }
    values.push(value);
  }
  return values;
}

async function askInteractive(defaults = {}) {
  const rl = readline.createInterface({ input, output });
  try {
    const next = {};
    next.framework = await askText(
      rl,
      "Framework (react/node/next, optional)",
      defaults.framework ?? "",
    );
    next.config = await askText(rl, "Custom config path (optional)", defaults.config ?? "");
    next.empty = await askYesNo(rl, "Start from empty structure?", Boolean(defaults.empty));
    next.path = await askText(rl, "Target path", defaults.path ?? ".");
    next.merge = await askYesNo(rl, "Merge if target exists?", Boolean(defaults.merge));
    next.overwrite = await askYesNo(
      rl,
      "Overwrite target if exists (deletes old files)?",
      Boolean(defaults.overwrite),
    );
    next.extend = await askYesNo(
      rl,
      "Merge framework + config if both provided?",
      Boolean(defaults.extend),
    );
    next.dryRun = await askYesNo(rl, "Dry run only (no writes)?", Boolean(defaults.dryRun));
    next.strict = await askYesNo(
      rl,
      "Fail if remove path does not exist?",
      Boolean(defaults.strict),
    );
    next.verbose = await askYesNo(rl, "Verbose logs?", Boolean(defaults.verbose));

    const wantsAddDirs = await askYesNo(rl, "Do you want to add extra directories?");
    next.addDir = wantsAddDirs ? await askRepeat(rl, "Directory path") : [];

    const wantsAddFiles = await askYesNo(rl, "Do you want to add extra empty files?");
    next.addFile = wantsAddFiles ? await askRepeat(rl, "File path") : [];

    const wantsSetFiles = await askYesNo(rl, "Do you want to set file content?");
    next.setFile = wantsSetFiles
      ? await askRepeat(rl, "File content spec (path::content)")
      : [];

    const wantsRemove = await askYesNo(rl, "Do you want to remove generated paths?");
    next.remove = wantsRemove ? await askRepeat(rl, "Path to remove") : [];

    return mergeOptions(defaults, next);
  } finally {
    rl.close();
  }
}

function pickGenerationFlags(options) {
  return {
    framework: options.framework,
    path: options.path,
    config: options.config,
    overwrite: options.overwrite,
    merge: options.merge,
    extend: options.extend,
    empty: options.empty,
    dryRun: options.dryRun,
    addDir: options.addDir,
    addFile: options.addFile,
    setFile: options.setFile,
    remove: options.remove,
    strict: options.strict,
    verbose: options.verbose,
  };
}

program
  .name("foldercraft")
  .description("Generate customizable folder structures for web projects")
  .version("1.0.0")
  .option("-f, --framework <name>", "Framework template (react, node, next)")
  .option("-p, --path <path>", "Target directory")
  .option("-c, --config <file>", "Custom JSON structure file")
  .option("-o, --overwrite", "Force overwrite existing directory", false)
  .option("-m, --merge", "Merge into existing directory (preserves existing files)", false)
  .option("-e, --extend", "Merge custom config over selected framework template", false)
  .option("--empty", "Start from an empty structure (no preset template)", false)
  .option("-d, --dry-run", "Preview actions without writing files", false)
  .option("--add-dir <paths...>", "Add custom directories (space separated)")
  .option("--add-file <paths...>", "Add custom empty files (space separated)")
  .option(
    "--set-file <pairs...>",
    "Set file content using path::content (space separated pairs)",
  )
  .option("--remove <paths...>", "Remove generated paths from final structure")
  .option("--strict", "Fail if remove path does not exist", false)
  .option("-i, --interactive", "Run guided mode with customization prompts", false)
  .option("--no-input", "Disable auto prompts and run only with provided flags", false)
  .option("--profile <name>", "Load saved profile")
  .option("--save-profile <name>", "Save current options as profile")
  .option("--list-profiles", "List all saved profiles", false)
  .option("--delete-profile <name>", "Delete a saved profile")
  .option(
    "--profile-store <file>",
    "Custom profile store path (default: ~/.foldercraft/profiles.json)",
  )
  .option("-v, --verbose", "Show detailed logs", false)
  .option("--no-banner", "Disable startup banner")
  .action(async (options, command) => {
    const logger = createLogger({ verbose: options.verbose });
    if (options.banner) {
      logger.banner();
    }

    try {
      const storePath = options.profileStore;
      if (options.listProfiles) {
        const names = await listProfiles(storePath);
        if (names.length === 0) {
          logger.info(`No profiles found in ${storePath ?? getDefaultProfilesPath()}`);
          return;
        }
        logger.success(`Profiles (${names.length}): ${names.join(", ")}`);
        return;
      }

      if (options.deleteProfile) {
        await removeProfile(options.deleteProfile, storePath);
        logger.success(`Deleted profile "${options.deleteProfile}"`);
        return;
      }

      let profileOptions = {};
      if (options.profile) {
        profileOptions = await loadProfile(options.profile, storePath);
        logger.info(`Loaded profile "${options.profile}"`);
      }

      let finalOptions = applyCliOverrides(profileOptions, options, command);
      const hasBaseSelection = Boolean(
        finalOptions.framework || finalOptions.config || finalOptions.empty,
      );
      const shouldPrompt =
        finalOptions.interactive || (!hasBaseSelection && !finalOptions.noInput);
      if (shouldPrompt) {
        finalOptions = await askInteractive(finalOptions);
      }

      await runFoldr({
        framework: finalOptions.framework,
        path: finalOptions.path,
        config: finalOptions.config,
        overwrite: finalOptions.overwrite,
        merge: finalOptions.merge,
        extend: finalOptions.extend,
        empty: finalOptions.empty,
        dryRun: finalOptions.dryRun,
        addDir: finalOptions.addDir,
        addFile: finalOptions.addFile,
        setFile: finalOptions.setFile,
        remove: finalOptions.remove,
        strict: finalOptions.strict,
        verbose: finalOptions.verbose,
        logger,
      });

      if (finalOptions.saveProfile) {
        const profileData = sanitizeGenerationOptions(pickGenerationFlags(finalOptions));
        await saveProfile(finalOptions.saveProfile, profileData, storePath);
        logger.success(`Saved profile "${finalOptions.saveProfile}"`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(message);

      if (options.verbose && error instanceof Error && error.stack) {
        process.stderr.write(`${error.stack}\n`);
      }

      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);

