import pc from "picocolors";

export function createLogger({ verbose = false } = {}) {
  return {
    success(message) {
      process.stdout.write(`${pc.green("✔")} ${message}\n`);
    },
    info(message) {
      process.stdout.write(`${pc.cyan("ℹ")} ${message}\n`);
    },
    warn(message) {
      process.stdout.write(`${pc.yellow("⚠")} ${message}\n`);
    },
    error(message) {
      process.stderr.write(`${pc.red("✖")} ${message}\n`);
    },
    debug(message) {
      if (verbose) {
        process.stdout.write(`${pc.gray("•")} ${message}\n`);
      }
    },
    banner() {
      process.stdout.write(
        `${pc.cyan("┌──────────────────────────┐")}\n` +
          `${pc.cyan("│")} ${pc.bold("foldercraft")} ${pc.gray("v1.0.0")}      ${pc.cyan("│")}\n` +
          `${pc.cyan("│")} Generate project folders ${pc.cyan("│")}\n` +
          `${pc.cyan("└──────────────────────────┘")}\n`,
      );
    },
  };
}

