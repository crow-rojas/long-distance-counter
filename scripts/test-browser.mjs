// node scripts/test-browser.mjs [local Vite URL] [assertion file]
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

async function main() {
  if (process.argv.length > 4) throw Error("Usage: test-browser.mjs [local Vite URL] [assertion file]");
  const url = new URL(process.argv[2] ?? "http://127.0.0.1:5173/");
  if (!["http:", "https:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username || url.password) {
    throw Error("Browser tests require a localhost URL without credentials.");
  }
  url.searchParams.set("t", "2026-09-18T09:55:00Z");
  const script = await readFile(process.argv[3] ?? new URL("../tests/platformer.browser.js", import.meta.url), "utf8");
  const timeout = Number(process.env.BROWSER_TEST_TIMEOUT_MS ?? 30000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 120000) {
    throw Error("BROWSER_TEST_TIMEOUT_MS must be an integer between 100 and 120000.");
  }

  const directory = await mkdtemp(join(tmpdir(), "fonda-qa-"));
  const session = `fonda-qa-${process.pid}-${Date.now()}`;
  const config = join(directory, "agent-browser.json");
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("AGENT_BROWSER_") || /^(https?|all|no)_proxy$/i.test(key)) delete env[key];
  }
  env.AGENT_BROWSER_DEFAULT_TIMEOUT = String(timeout);
  env.AGENT_BROWSER_IDLE_TIMEOUT_MS = String(timeout + 60000);
  let active, opened = false, closing = false, interrupted = false;
  const interrupt = (code) => {
    interrupted = true;
    process.exitCode = code;
    if (!closing) active?.kill("SIGKILL");
  };
  const onInt = () => interrupt(130), onTerm = () => interrupt(143);
  process.on("SIGINT", onInt);
  process.on("SIGTERM", onTerm);

  const command = (args, input = "", deadline = timeout) => new Promise((resolve, reject) => {
    if (interrupted && !closing) return reject(Error("Browser test interrupted."));
    active = execFile("agent-browser", ["--config", config, "--session", session, "--json", ...args], {
      cwd: directory, env, timeout: deadline, killSignal: "SIGKILL", maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      active = undefined;
      if (error) return reject(Error(interrupted ? "Browser test interrupted." :
        error.killed ? `${args[0]} exceeded ${deadline} ms.` : `${error.message}\n${stderr}`));
      try {
        const response = JSON.parse(stdout);
        if (!response.success) throw Error(response.error ?? `${args[0]} failed.`);
        resolve(response.data);
      } catch (error) { reject(error); }
    });
    // Early CLI failure may close stdin before the assertion source is written.
    active.stdin.on("error", () => {});
    active.stdin.end(input);
  });

  try {
    await writeFile(config, "{}");
    console.log(`Browser test session: ${session}`);
    opened = true;
    await command(["open", url.href, "--args", "--mute-audio"]);
    await command(["wait", "body.playing"]);
    const until = Date.now() + timeout;
    // Do not leave the daemon awaiting the test promise: it must accept close on interruption.
    await command(["eval", "--stdin"], `
      window.__fondaQA = { done: false };
      void (async () => {
        try {
          if (location.origin !== ${JSON.stringify(url.origin)}) throw Error("Preview left its local origin.");
          window.__fondaQA = { done: true, result: await (0, eval)(${JSON.stringify(script)}) };
        } catch (error) {
          window.__fondaQA = { done: true, error: String(error?.stack ?? error) };
        }
      })();
    `);
    while (true) {
      const remaining = until - Date.now();
      if (remaining <= 0) throw Error(`Browser assertions exceeded ${timeout} ms.`);
      const { result: state } = await command(["eval", "--stdin"], "window.__fondaQA", remaining);
      if (state?.done) {
        if (state.error) throw Error(state.error);
        if (state.result?.passed !== true) throw Error("Browser assertions did not return passed: true.");
        console.log(JSON.stringify(state.result));
        break;
      }
      await delay(100);
    }
  } finally {
    closing = true;
    if (opened) {
      try {
        const until = Date.now() + 10000;
        await command(["close"], "", 10000);
        // close can acknowledge before the daemon removes its session socket.
        while (true) {
          const remaining = until - Date.now();
          if (remaining <= 0) throw Error("Session remained active after close.");
          const { sessions } = await command(["session", "list"], "", remaining);
          if (!sessions.includes(session)) break;
          await delay(100);
        }
        console.log(`Closed browser session: ${session}`);
      } catch (error) {
        process.exitCode ||= 1;
        console.error(`Could not close ${session}: ${error.message}`);
      }
    }
    await rm(directory, { recursive: true, force: true });
    process.off("SIGINT", onInt);
    process.off("SIGTERM", onTerm);
  }
}

main().catch(error => {
  process.exitCode ||= 1;
  console.error(error.message);
});
