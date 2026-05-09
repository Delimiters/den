import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";
import type { Options } from "@wdio/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tauriDriver: ChildProcess;

// On Windows CI we build with --target x86_64-pc-windows-msvc, so the binary lands
// in the target-triple subdirectory instead of target/debug/.
const appBinary = path.resolve(
  process.cwd(),
  "src-tauri",
  "target",
  ...(process.platform === "win32"
    ? ["x86_64-pc-windows-msvc", "debug", "Den.exe"]
    : ["debug", "Den"])
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
