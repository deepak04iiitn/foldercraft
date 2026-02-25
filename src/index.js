import { createStructure } from "./core/createStructure.js";
import { loadReactTemplate } from "./generators/react.js";
import { loadNodeTemplate } from "./generators/node.js";
import { loadNextTemplate } from "./generators/next.js";
import { loadCustomTemplate } from "./generators/custom.js";
import { createLogger } from "./utils/logger.js";
import { mergeNodes, validateNode } from "./utils/structureHelpers.js";
import { applyCustomizations, hasCustomizations } from "./core/structureCustomizer.js";

const FRAMEWORK_LOADERS = {
  react: loadReactTemplate,
  node: loadNodeTemplate,
  next: loadNextTemplate,
};

export async function runFoldr(options = {}) {
  const {
    framework,
    path: targetPath = ".",
    config,
    overwrite = false,
    merge = false,
    extend = false,
    empty = false,
    dryRun = false,
    verbose = false,
    addDir,
    addFile,
    setFile,
    remove,
    strict = false,
    logger: providedLogger,
  } = options;

  const logger = providedLogger ?? createLogger({ verbose });
  if (overwrite && merge) {
    throw new Error("Use either --overwrite or --merge, not both.");
  }

  let frameworkStructure;
  if (framework) {
    const frameworkName = framework.toLowerCase();
    const loader = FRAMEWORK_LOADERS[frameworkName];
    if (!loader) {
      throw new Error(
        `Invalid framework "${framework}". Valid options: react, node, next.`,
      );
    }
    logger.info(`Using ${frameworkName} template`);
    frameworkStructure = await loader();
  }

  let customStructure;
  if (config) {
    logger.info(`Using custom config: ${config}`);
    customStructure = await loadCustomTemplate(config);
  }

  if (!frameworkStructure && !customStructure) {
    const hasUserCustomizations = hasCustomizations({
      addDirs: addDir,
      addFiles: addFile,
      setFiles: setFile,
      removePaths: remove,
    });
    if (empty || hasUserCustomizations) {
      logger.info("Starting from an empty structure");
      frameworkStructure = {};
    }
  }

  if (!frameworkStructure && !customStructure) {
    throw new Error(
      "Please provide --framework <react|node|next> or use --config <file>.",
    );
  }

  let structure = frameworkStructure ?? customStructure;
  if (frameworkStructure && customStructure && extend) {
    structure = mergeNodes(frameworkStructure, customStructure);
    logger.info("Merged framework template with custom config");
  } else if (frameworkStructure && customStructure && !extend) {
    logger.warn(
      "Both --framework and --config were provided. Using custom config. Add --extend to merge both.",
    );
    structure = customStructure;
  }

  structure = applyCustomizations(
    structure,
    {
      addDirs: addDir,
      addFiles: addFile,
      setFiles: setFile,
      removePaths: remove,
      strictRemove: strict,
    },
    logger,
  );

  validateNode(structure);
  const strategy = overwrite ? "replace" : merge ? "merge" : "error";
  const fileWritePolicy = strategy === "merge" ? "skip" : "overwrite";

  if (dryRun) {
    logger.info("Dry run mode enabled (no filesystem changes)");
  }

  const resolvedPath = await createStructure({
    structure,
    targetPath,
    strategy,
    dryRun,
    fileWritePolicy,
    logger,
  });

  if (dryRun) {
    logger.success(`Dry run completed for: ${resolvedPath}`);
  } else {
    logger.success(`Folder structure generated at: ${resolvedPath}`);
  }
  return { outputPath: resolvedPath, dryRun };
}

