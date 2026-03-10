#!/usr/bin/env node
// monitor.js — Van Tracker Health Monitor
// Run: node monitor.js
// Watches your API server + Firebase location freshness in real time

import http from "http";
import https from "https";

// ─── CONFIG — edit these ──────────────────────────────────────────────────────
const CONFIG = {
  apiBaseUrl: "http://localhost:3000",   // Your server URL
  vanIds: ["van1"],                      // Van IDs to monitor
  checkIntervalSeconds: 15,             // How often to check
  locationStaleAfterSeconds: 60,        // Alert if location not updated in 60s
  firebaseProjectId: "navi-kid-school-van-tracker",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const colors = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

function timestamp() {
  return new Date().toLocaleTimeString();
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: 5000, ...options }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

// ─── Checks ───────────────────────────────────────────────────────────────────

async function checkServerHealth() {
  try {
    const { status, body } = await fetchJson(`${CONFIG.apiBaseUrl}/health`);
    if (status === 200) {
      return { ok: true, label: "API Server", detail: "Online ✅", data: body };
    } else {
      return { ok: false, label: "API Server", detail: `Degraded (HTTP ${status}) ⚠️`, data: body };
    }
  } catch (err) {
    return { ok: false, label: "API Server", detail: `Unreachable ❌ — ${err.message}` };
  }
}

async function checkVanLocation(vanId) {
  try {
    const { status, body } = await fetchJson(`${CONFIG.apiBaseUrl}/location/${vanId}`);

    if (status === 404) {
      return { ok: false, label: `Van [${vanId}]`, detail: "No location data in Firebase ❌" };
    }
    if (status !== 200) {
      return { ok: false, label: `Van [${vanId}]`, detail: `HTTP ${status} error ❌` };
    }

    const lat = body.latitude;
    const lng = body.longitude;

    // Check coordinate validity
    if (typeof lat !== "number" || typeof lng !== "number") {
      return { ok: false, label: `Van [${vanId}]`, detail: "Invalid coordinates in database ❌" };
    }

    // Check if location is stale
    let staleWarning = "";
    if (body.updatedAt) {
      const updatedMs = body.updatedAt._seconds
        ? body.updatedAt._seconds * 1000
        : new Date(body.updatedAt).getTime();
      const ageSeconds = (Date.now() - updatedMs) / 1000;

      if (ageSeconds > CONFIG.locationStaleAfterSeconds) {
        staleWarning = colors.yellow(` ⚠️  Stale: ${Math.round(ageSeconds)}s ago`);
      } else {
        staleWarning = colors.dim(` (${Math.round(ageSeconds)}s ago)`);
      }
    }

    return {
      ok: true,
      label: `Van [${vanId}]`,
      detail: `📍 (${lat.toFixed(5)}, ${lng.toFixed(5)})${staleWarning}`,
    };
  } catch (err) {
    return { ok: false, label: `Van [${vanId}]`, detail: `Request failed ❌ — ${err.message}` };
  }
}

async function checkUpdateEndpoint() {
  // POST a test location to verify write path works end-to-end
  return new Promise((resolve) => {
    const body = JSON.stringify({
      driverId: "monitor-healthcheck",
      latitude: 7.8731,
      longitude: 80.7718,
    });

    const url = new URL(`${CONFIG.apiBaseUrl}/update-location`);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length,
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, label: "Write Path", detail: "POST /update-location → Firebase ✅" });
        } else {
          resolve({ ok: false, label: "Write Path", detail: `HTTP ${res.statusCode} ❌ ${data}` });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ ok: false, label: "Write Path", detail: `Failed ❌ — ${err.message}` });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, label: "Write Path", detail: "Timeout ❌" });
    });
    req.write(body);
    req.end();
  });
}

// ─── Display ──────────────────────────────────────────────────────────────────
let checkCount = 0;
const history = []; // last 10 run results

function printReport(results) {
  checkCount++;
  const allOk = results.every((r) => r.ok);
  const now = timestamp();

  console.clear();
  console.log(colors.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(colors.bold(`  🚐  Van Tracker Monitor  |  Check #${checkCount}  |  ${now}`));
  console.log(colors.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));

  results.forEach((r) => {
    const icon = r.ok ? colors.green("●") : colors.red("●");
    const label = colors.bold(r.label.padEnd(20));
    console.log(`  ${icon}  ${label} ${r.detail}`);
  });

  console.log(colors.dim("─────────────────────────────────────────────────────"));

  // History (last 10)
  history.push(allOk ? "✅" : "❌");
  if (history.length > 10) history.shift();
  console.log(`  History: ${history.join(" ")}`);

  console.log(colors.dim(`\n  Next check in ${CONFIG.checkIntervalSeconds}s  |  Ctrl+C to stop`));

  if (!allOk) {
    console.log(colors.yellow("\n  ⚠️  ACTION NEEDED — see red items above"));
  }
}

// ─── Run Loop ─────────────────────────────────────────────────────────────────
async function runChecks() {
  const results = await Promise.all([
    checkServerHealth(),
    checkUpdateEndpoint(),
    ...CONFIG.vanIds.map(checkVanLocation),
  ]);
  printReport(results);
}

console.log(colors.cyan("🚐 Starting Van Tracker Monitor..."));
console.log(colors.dim(`   Watching: ${CONFIG.apiBaseUrl}`));
console.log(colors.dim(`   Interval: ${CONFIG.checkIntervalSeconds}s\n`));

runChecks();
setInterval(runChecks, CONFIG.checkIntervalSeconds * 1000);
