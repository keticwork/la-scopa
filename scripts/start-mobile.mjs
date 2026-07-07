import os from "node:os";
import net from "node:net";
import process from "node:process";
import { spawn } from "node:child_process";

const mode = process.argv[2] === "lan" ? "lan" : "tunnel";
const requestedPort = Number.parseInt(process.env.EXPO_PORT ?? "8081", 10);
const maxTunnelAttempts = Number.parseInt(process.env.EXPO_TUNNEL_ATTEMPTS ?? "4", 10);
const expoCommand = process.platform === "win32" ? "npx.cmd" : "npx";

let activeChild;
let attempt = 0;
let selectedPort = requestedPort;
let shuttingDown = false;

function getLocalIp() {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }

  return "127.0.0.1";
}

function startExpo() {
  attempt += 1;

  const env = {
    ...process.env,
    EXPO_NO_TELEMETRY: "1"
  };
  const args = ["expo", "start", "--port", String(selectedPort)];

  if (mode === "lan") {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = getLocalIp();
    args.push("--lan");
    console.log(`Starting Expo in LAN mode on ${env.REACT_NATIVE_PACKAGER_HOSTNAME}:${selectedPort}`);
  } else {
    args.push("--tunnel");
    console.log(`Starting Expo tunnel attempt ${attempt}/${maxTunnelAttempts} on port ${selectedPort}`);
  }

  activeChild = spawn(expoCommand, args, {
    env,
    stdio: "inherit"
  });

  activeChild.on("exit", (code, signal) => {
    activeChild = undefined;

    if (shuttingDown) {
      process.exit(0);
    }

    if (signal === "SIGINT" || signal === "SIGTERM") {
      process.exit(0);
    }

    if (mode === "tunnel" && attempt < maxTunnelAttempts) {
      console.log(`Expo tunnel stopped with code ${code ?? "unknown"}. Retrying in 2s...`);
      setTimeout(startExpo, 2000);
      return;
    }

    process.exit(code ?? 1);
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error(`No available Expo port found from ${startPort} to ${startPort + 19}`);
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "0.0.0.0");
  });
}

process.on("SIGINT", () => {
  shuttingDown = true;

  if (activeChild) {
    activeChild.kill("SIGINT");
    return;
  }

  process.exit(0);
});

process.on("SIGTERM", () => {
  shuttingDown = true;

  if (activeChild) {
    activeChild.kill("SIGTERM");
    return;
  }

  process.exit(0);
});

selectedPort = await findAvailablePort(requestedPort);

if (selectedPort !== requestedPort) {
  console.log(`Port ${requestedPort} is busy. Using ${selectedPort} instead.`);
}

startExpo();
