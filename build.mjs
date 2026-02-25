import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");

await fs.remove(distDir);
await fs.copy(srcDir, distDir);

const distCliPath = path.join(distDir, "cli.js");
try {
  await fs.chmod(distCliPath, 0o755);
} catch {
  // chmod can fail on Windows. The shebang still works after npm link.
}

