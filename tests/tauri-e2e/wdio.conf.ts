import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";
import type { Options } from "@wdio/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tauriDriver: ChildProcess;

// Path to the debug binary — built with `npm run tauri build -- --debug --bundles none`
const appBinary = path.resolve(
  process.cwd(),
  "src-tauri",
  "target",
  "debug",
  process.platform === "win32" ? "Den.exe" : "Den"
);

const driverBin = path.resolve(
  os.homedir(),
  ".cargo",
  "bin",
  process.platform === "win32" ? "tauri-driver.exe" : "tauri-driver"
);

export const config: Options.Testrunner = {
  hostname: "127.0.0.1",
  port: 4444,
  specs: [path.resolve(__dirname, "specs", "**", "*.spec.ts")],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: appBinary,
      },
    } as WebdriverIO.Capabilities,
  ],
  logLevel: "warn",
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60_000,
  },

  onPrepare() {
    tauriDriver = spawn(driverBin, [], {
      stdio: [null, process.stdout, process.stderr],
    });
  },

  onComplete() {
    tauriDriver?.kill();
  },
};
