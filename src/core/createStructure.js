import fs from "fs-extra";
import { buildFileTree } from "./fileTreeBuilder.js";
import { validateTargetPath } from "../utils/validatePath.js";
import { handleOverwrite } from "../utils/overwriteHandler.js";

export async function createStructure({
  structure,
  targetPath,
  strategy = "error",
  dryRun = false,
  fileWritePolicy = "overwrite",
  logger,
}) {
  const resolvedTarget = await validateTargetPath(targetPath);

  await handleOverwrite(resolvedTarget, { strategy, dryRun }, logger);
  if (dryRun) {
    logger?.info(`[dry-run] Ensure root directory: ${resolvedTarget}`);
  } else {
    await fs.ensureDir(resolvedTarget);
    logger?.debug(`Ensured root directory: ${resolvedTarget}`);
  }

  await buildFileTree(structure, resolvedTarget, logger, {
    dryRun,
    fileWritePolicy,
  });

  return resolvedTarget;
}

