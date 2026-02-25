import path from "node:path";
import fs from "fs-extra";

export async function validateTargetPath(inputPath) {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("A valid target path is required.");
  }

  if (inputPath.trim() === "") {
    throw new Error("Target path cannot be empty.");
  }

  const resolvedPath = path.resolve(process.cwd(), inputPath);
  const parsed = path.parse(resolvedPath);
  if (resolvedPath === parsed.root) {
    throw new Error("Refusing to operate on filesystem root. Please choose a project directory.");
  }

  const parent = path.dirname(resolvedPath);
  const parentExists = await fs.pathExists(parent);
  if (!parentExists) {
    throw new Error(
      `Parent directory does not exist: ${parent}. Create it first or use a different target path.`,
    );
  }

  return resolvedPath;
}

