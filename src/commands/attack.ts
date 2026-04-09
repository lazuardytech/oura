import { Command } from "commander";
import { K6Runner, AttackOptions } from "../k6/runner.js";
import { validateTarget, validateProxy, validateMethod, validateDuration, validateVUs, parseThreshold } from "../utils/validator.js";
import { loadConfig, saveConfig } from "./config.js";
import { logger } from "../utils/logger.js";

const CONFIG = loadConfig();

function isDefault<T>(value: T, defaultValue: T): boolean {
  return value === defaultValue;
}

export const attackCommand = new Command("attack")
  .description("Launch a stress test against a target URL")
  .requiredOption("-t, --target <url>", "Target URL to stress test")
  .option("-m, --method <method>", "HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)", "GET")
  .option("-u, --vus <number>", "Number of virtual users", String(CONFIG.defaultVus))
  .option("-d, --duration <string>", "Test duration (e.g. 30s, 1m, 5m)", CONFIG.defaultDuration)
  .option("-r, --ramp-up <string>", "Ramp-up stages (e.g. '0:10,10:20,50:10')", "")
  .option("-w, --payload <string>", "Request body/payload (JSON string)", "")
  .option("-H, --headers <string>", "Custom headers (JSON string)", "")
  .option("-s, --scenario <type>", "Attack scenario: bombard, ramping, soak, stealth", CONFIG.defaultScenario)
  .option("-o, --output <path>", "Output path for k6 summary JSON", "")
  .option("--threshold <thresholds...>", "Pass/fail thresholds (e.g. 'http_req_duration:p(95)<500')")
  .option("--iterations <number>", "Number of iterations per VU (overrides duration for bombard)")
  .option("--no-check", "Disable default response checks", false)
  .option("--stealth", "Enable stealth mode with rotating headers and random delays", false)
  .option("--proxy <url>", "Proxy URL (HTTP/HTTPS/SOCKS5)", "")
  .option("--rps <number>", "Requests per second per VU (default: 1000)", String(CONFIG.defaultRpsPerVu))
  .action(async (options) => {
    try {
      validateTarget(options.target);
      validateMethod(options.method || "GET");

      if (!validateDuration(options.duration)) {
        throw new Error(`Invalid duration: '${options.duration}'. Expected format like 30s, 5m, or 1h.`);
      }

      const vus = parseInt(options.vus, 10);
      if (!validateVUs(vus)) {
        throw new Error(`Invalid VUs: '${options.vus}'. Must be a positive integer.`);
      }

      if (options.proxy) {
        validateProxy(options.proxy);
      }

      const parsedThresholds = options.threshold ? (options.threshold as string[]).map((t: string) => parseThreshold(t)) : [];
      const iterations = options.iterations ? parseInt(options.iterations, 10) : 0;

      const attackOpts: AttackOptions = {
        target: options.target,
        method: (options.method || "GET").toUpperCase(),
        vus,
        duration: options.duration,
        scenario: options.scenario,
        payload: options.payload || "",
        headers: options.headers ? JSON.parse(options.headers) : {},
        rampUp: options.rampUp || "",
        output: options.output || "",
        noCheck: options.noCheck || false,
        stealth: options.stealth || false,
        proxy: options.proxy || "",
        thresholds: options.threshold || [],
        iterations,
        rpsPerVu: parseInt(options.rps, 10),
      };

      if (attackOpts.stealth) {
        logger.info("Stealth mode enabled: rotating headers and random delays");
      }
      if (attackOpts.proxy) {
        logger.info(`Proxy configured: ${attackOpts.proxy}`);
      }

      logger.info(`Target: ${attackOpts.target}`);
      logger.info(`Scenario: ${attackOpts.scenario}`);
      logger.info(`VUs: ${attackOpts.vus} | Duration: ${attackOpts.duration} | RPS/VU: ${attackOpts.rpsPerVu}`);

      const runner = new K6Runner();
      const script = runner.compileScript(attackOpts);
      await runner.execute(script, attackOpts);

      const config = loadConfig();
      config.lastTarget = attackOpts.target;
      saveConfig(config);
    } catch (err: any) {
      logger.error(`Attack failed: ${err.message}`);
      process.exit(1);
    }
  });