import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadNodeTemplate() {
  const templatePath = path.join(__dirname, "../templates/node.json");
  try {
    return await fs.readJson(templatePath);
  } catch {
    throw new Error("Node template is missing or invalid.");
  }
}

