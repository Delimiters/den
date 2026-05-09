import path from "path";
import { fileURLToPath } from "url";
import { connect } from "net";
import { spawn, type ChildProcess } from "child_process";
import type { Options } from "@wdio/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let edgeDriver: ChildProcess;
let denProcess: ChildProcess;

// Path to the debug binary — built with `npm run tauri build -- --debug --no-bundle`
const appBinary = path.resolve(
  process.cwd(),
  "src-tauri",
  "target",
  "debug",
  process.platform === "win32" ? "Den.exe" : "Den"
);

const APP_DEBUG_PORT = 9222;
const DRIVER_PORT = 9515;

// Poll until the given TCP port accepts connections.
function waitForPort(port: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      const socket = connect(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline)
          reject(new Error(`Port ${port} not available after ${timeoutMs}ms`));
        else setTimeout(attempt, 500);
      });
    }
    attempt();
  });
}

export const config: Options.Testrunner = {
  hostname: "127.0.0.1",
  port: DRIVER_PORT,
  specs: [path.resolve(__dirname, "specs", "**", "*.spec.ts")],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      browserName: "MicrosoftEdge",
      "ms:edgeOptions": {
        // Connect to the running WebView2 instance via remote debug port.
        // Works with all msedgedriver versions; avoids the newer useWebView flag.
        debuggerAddress: `localhost:${APP_DEBUG_PORT}`,
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

  async onPrepare() {
    // Launch Den with WebView2 remote debugging enabled so msedgedriver can attach.
    denProcess = spawn(appBinary, [], {
      env: {
        ...process.env,
        WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${APP_DEBUG_PORT}`,
      },
      stdio: [null, process.stdout, process.stderr],
    });

    // Wait for the WebView2 debug port to open.
    await waitForPort(APP_DEBUG_PORT);

    // Start msedgedriver.
    edgeDriver = spawn(
      process.platform === "win32" ? "msedgedriver.exe" : "msedgedriver",
      [`--port=${DRIVER_PORT}`, "--silent"],
      { stdio: [null, process.stdout, process.stderr] }
    );

    // Give msedgedriver a moment to start accepting connections.
    await new Promise((r) => setTimeout(r, 2_000));
  },

  onComplete() {
    edgeDriver?.kill();
    denProcess?.kill();
  },
};
