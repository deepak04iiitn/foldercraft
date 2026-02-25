import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, test } from "vitest";
import { runFoldr } from "../src/index.js";

const tempRoot = path.join(os.tmpdir(), "foldr-tests");
const createdDirs = [];

afterEach(async () => {
  for (const dir of createdDirs.splice(0)) {
    await fs.remove(dir);
  }
});

function trackTempDir(name) {
  const dir = path.join(tempRoot, `${name}-${Date.now()}-${Math.random()}`);
  createdDirs.push(dir);
  return dir;
}

describe("foldr generator", () => {
  test("creates nested structure recursively for react template", async () => {
    const target = trackTempDir("react");

    await runFoldr({
      framework: "react",
      path: target,
      overwrite: false,
      verbose: false,
    });

    await expect(fs.pathExists(path.join(target, "src", "components"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(target, "src", "hooks"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(target, "public"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(target, "package.json"))).resolves.toBe(true);
  });

  test("fails when target exists and overwrite is false", async () => {
    const target = trackTempDir("overwrite");
    await fs.ensureDir(target);

    await expect(
      runFoldr({
        framework: "node",
        path: target,
        overwrite: false,
      }),
    ).rejects.toThrow("Use --overwrite to replace it");
  });

  test("replaces existing directory when overwrite is true", async () => {
    const target = trackTempDir("overwrite-true");
    await fs.ensureDir(path.join(target, "old"));
    await fs.writeFile(path.join(target, "old", "legacy.txt"), "legacy");

    await runFoldr({
      framework: "node",
      path: target,
      overwrite: true,
    });

    await expect(fs.pathExists(path.join(target, "old"))).resolves.toBe(false);
    await expect(fs.pathExists(path.join(target, "src", "routes"))).resolves.toBe(true);
  });

  test("throws on invalid framework", async () => {
    const target = trackTempDir("invalid-framework");
    await expect(
      runFoldr({
        framework: "vue",
        path: target,
      }),
    ).rejects.toThrow('Invalid framework "vue"');
  });

  test("loads custom config and creates files/folders", async () => {
    const target = trackTempDir("custom");
    const configFile = path.join(target, "custom.json");
    await fs.ensureDir(target);
    await fs.writeJson(configFile, {
      app: {
        core: {},
      },
      "README.md": "file",
    });

    const output = path.join(target, "output");
    await runFoldr({
      config: configFile,
      path: output,
      overwrite: false,
    });

    await expect(fs.pathExists(path.join(output, "app", "core"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(output, "README.md"))).resolves.toBe(true);
  });

  test("supports custom file content in config", async () => {
    const target = trackTempDir("content-config");
    const configFile = path.join(target, "content.json");
    await fs.ensureDir(target);
    await fs.writeJson(configFile, {
      docs: {
        "README.md": "# Hello foldr\n",
      },
    });

    const output = path.join(target, "output");
    await runFoldr({
      config: configFile,
      path: output,
    });

    const content = await fs.readFile(path.join(output, "docs", "README.md"), "utf8");
    expect(content).toBe("# Hello foldr\n");
  });

  test("merge mode keeps existing files and adds missing nodes", async () => {
    const target = trackTempDir("merge");
    await fs.ensureDir(path.join(target, "src"));
    await fs.writeFile(path.join(target, "src", "legacy.txt"), "keep");

    await runFoldr({
      framework: "react",
      path: target,
      merge: true,
    });

    const legacy = await fs.readFile(path.join(target, "src", "legacy.txt"), "utf8");
    expect(legacy).toBe("keep");
    await expect(fs.pathExists(path.join(target, "src", "components"))).resolves.toBe(true);
  });

  test("dry run does not create target directory", async () => {
    const target = trackTempDir("dry-run");

    await runFoldr({
      framework: "node",
      path: target,
      dryRun: true,
    });

    await expect(fs.pathExists(target)).resolves.toBe(false);
  });

  test("extend mode merges framework and custom config", async () => {
    const target = trackTempDir("extend");
    await fs.ensureDir(target);
    const configFile = path.join(target, "extend.json");
    await fs.writeJson(configFile, {
      src: {
        "custom.js": "file",
      },
      docs: {},
    });

    const output = path.join(target, "output");
    await runFoldr({
      framework: "node",
      config: configFile,
      extend: true,
      path: output,
    });

    await expect(fs.pathExists(path.join(output, "src", "routes"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(output, "src", "custom.js"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(output, "docs"))).resolves.toBe(true);
  });

  test("uses custom config when framework and config are both provided without extend", async () => {
    const target = trackTempDir("config-priority");
    await fs.ensureDir(target);
    const configFile = path.join(target, "custom.json");
    await fs.writeJson(configFile, { docs: {} });

    const output = path.join(target, "output");
    await runFoldr({
      framework: "node",
      config: configFile,
      path: output,
    });

    await expect(fs.pathExists(path.join(output, "docs"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(output, "src", "routes"))).resolves.toBe(false);
  });

  test("builds from empty mode and customization flags", async () => {
    const target = trackTempDir("empty-custom");
    await runFoldr({
      empty: true,
      path: target,
      addDir: ["src/features", "docs"],
      addFile: [".env"],
      setFile: ["README.md::# Custom Project"],
    });

    await expect(fs.pathExists(path.join(target, "src", "features"))).resolves.toBe(true);
    await expect(fs.pathExists(path.join(target, ".env"))).resolves.toBe(true);
    const readme = await fs.readFile(path.join(target, "README.md"), "utf8");
    expect(readme).toBe("# Custom Project");
  });

  test("can remove generated nodes with remove customization", async () => {
    const target = trackTempDir("remove-custom");
    await runFoldr({
      framework: "react",
      path: target,
      remove: ["tests", "src/pages"],
    });

    await expect(fs.pathExists(path.join(target, "tests"))).resolves.toBe(false);
    await expect(fs.pathExists(path.join(target, "src", "pages"))).resolves.toBe(false);
    await expect(fs.pathExists(path.join(target, "src", "components"))).resolves.toBe(true);
  });
});

