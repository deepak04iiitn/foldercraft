import fs from "fs-extra";

export async function handleOverwrite(
  targetPath,
  { strategy = "error", dryRun = false } = {},
  logger,
) {
  const exists = await fs.pathExists(targetPath);
  if (!exists) {
    return;
  }

  if (strategy === "merge") {
    logger?.info(`Merging into existing directory: ${targetPath}`);
    return;
  }

  if (strategy === "error") {
    throw new Error(
      `Target directory already exists: ${targetPath}. Use --overwrite to replace it or --merge to keep existing files.`,
    );
  }

  if (strategy !== "replace") {
    throw new Error(`Unknown strategy "${strategy}". Expected: error, replace, merge.`);
  }

  logger?.warn(`Removing existing directory: ${targetPath}`);
  if (!dryRun) {
    await fs.remove(targetPath);
  }
}

