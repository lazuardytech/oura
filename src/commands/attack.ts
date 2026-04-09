import { Command } from "commander";
import { K6Runner, AttackOptions } from "../k6/runner.js";
import { validateTarget } from "../utils/validator.js";
import { logger } from "../utils/logger.js";

export const attackCommand = new Command("attack")
  .description("Launch a stress test against a target URL")
  .requiredOption("-t, --target <url>", "Target URL to stress test")
  .option("-m, --method <method>", "HTTP method (GET, POST, PUT, DELETE)", "GET")
  .option("-u, --vus <number>", "Number of virtual users", "100")
  .option("-d, --duration <string>", "Test duration (e.g. 30s, 1m, 5m)", "30s")
  .option("-r, --ramp-up <string>", "Ramp-up stages (e.g. '0:10,10:20,50:10')", "")
  .option("-w, --payload <string>", "Request body/payload (JSON string)", "")
  .option("-H, --headers <string>", "Custom headers (JSON string)", "")
  .option("-s, --scenario <type>", "Attack scenario: bombard, ramping, soak", "bombard")
  .option("-o, --output <path>", "Output path for k6 summary JSON", "")
  .option("--tags <string>", "Tags for the test run (JSON string)", "")
  .option("--no-check", "Disable default response checks", false)
  .action(async (options) => {
    try {
      validateTarget(options.target);

      const attackOpts: AttackOptions = {
        target: options.target,
        method: options.method?.toUpperCase() || "GET",
        vus: parseInt(options.vus, 10),
        duration: options.duration,
        scenario: options.scenario,
        payload: options.payload || "",
        headers: options.headers ? JSON.parse(options.headers) : {},
        rampUp: options.rampUp || "",
        output: options.output || "",
        noCheck: options.noCheck || false,
      };

      logger.info(`Target: ${attackOpts.target}`);
      logger.info(`Scenario: ${attackOpts.scenario}`);
      logger.info(`VUs: ${attackOpts.vus} | Duration: ${attackOpts.duration}`);

      const runner = new K6Runner();
      const script = runner.compileScript(attackOpts);
      await runner.execute(script, attackOpts);
    } catch (err: any) {
      logger.error(`Attack failed: ${err.message}`);
      process.exit(1);
    }
  });