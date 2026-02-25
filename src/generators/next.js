import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadNextTemplate() {
  const templatePath = path.join(__dirname, "../templates/next.json");
  try {
    return await fs.readJson(templatePath);
  } catch {
    throw new Error("Next template is missing or invalid.");
  }
}

