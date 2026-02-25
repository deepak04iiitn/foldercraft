import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, test } from "vitest";
import {
  listProfiles,
  loadProfile,
  removeProfile,
  saveProfile,
} from "../src/utils/profileStore.js";

const tempDirs = [];

function trackTempDir(name) {
  const dir = path.join(os.tmpdir(), `foldr-profile-tests-${name}-${Date.now()}-${Math.random()}`);
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.remove(dir);
  }
});

describe("profile store", () => {
  test("saves and loads profile", async () => {
    const root = trackTempDir("save-load");
    const store = path.join(root, "profiles.json");

    await saveProfile(
      "starter",
      {
        framework: "react",
        addDir: ["src/features"],
      },
      store,
    );

    const profile = await loadProfile("starter", store);
    expect(profile.framework).toBe("react");
    expect(profile.addDir).toEqual(["src/features"]);
  });

  test("lists and deletes profiles", async () => {
    const root = trackTempDir("list-delete");
    const store = path.join(root, "profiles.json");

    await saveProfile("a", { empty: true }, store);
    await saveProfile("b", { framework: "node" }, store);
    await expect(listProfiles(store)).resolves.toEqual(["a", "b"]);

    await removeProfile("a", store);
    await expect(listProfiles(store)).resolves.toEqual(["b"]);
  });

  test("throws for unknown profile", async () => {
    const root = trackTempDir("missing");
    const store = path.join(root, "profiles.json");
    await expect(loadProfile("not-found", store)).rejects.toThrow('Profile "not-found" not found.');
  });
});

