import { Command } from "commander";
import { K6Runner, type AttackOptions } from "../k6/runner.js";
import {
	validateTarget,
	validateProxy,
	validateMethod,
	validateDuration,
	validateVUs,
} from "../utils/validator.js";
import { loadConfig, saveConfig } from "./config.js";
import { logger } from "../utils/logger.js";
import fs from "node:fs";

const CONFIG = loadConfig();

export const attackCommand = new Command("attack")
	.description("Launch a stress test against a target URL")
	.requiredOption("-t, --target <url>", "Target URL to stress test")
	.option(
		"-m, --method <method>",
		"HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)",
		"GET",
	)
	.option(
		"-u, --vus <number>",
		"Number of virtual users",
		String(CONFIG.defaultVus),
	)
	.option(
		"-d, --duration <string>",
		"Test duration (e.g. 30s, 1m, 5m)",
		CONFIG.defaultDuration,
	)
	.option(
		"-r, --ramp-up <string>",
		"Ramp-up stages (e.g. '0:10,10:20,50:10')",
		"",
	)
	.option("-w, --payload <string>", "Request body/payload (JSON string)", "")
	.option("-H, --headers <string>", "Custom headers (JSON string)", "")
	.option(
		"-s, --scenario <type>",
		"Attack scenario: bombard, ramping, soak, stealth, form-flood-1 (partnership), form-flood-2 (login)",
		CONFIG.defaultScenario,
	)
	.option("-o, --output <path>", "Output path for k6 summary JSON", "")
	.option(
		"--threshold <thresholds...>",
		"Pass/fail thresholds (e.g. 'http_req_duration:p(95)<500')",
	)
	.option(
		"--iterations <number>",
		"Number of iterations per VU (overrides duration for bombard)",
	)
	.option("--no-check", "Disable default response checks", false)
	.option(
		"--stealth",
		"Enable stealth mode with rotating headers and random delays",
		false,
	)
	.option("--proxy <url>", "Proxy URL (HTTP/HTTPS/SOCKS5)", "")
	.option(
		"--proxy-file <path>",
		"Path to file with proxy list (one proxy per line)",
		"",
	)
	.option("--origin <ip>", "Origin server IP to bypass CDN (e.g. 1.2.3.4)", "")
	.option(
		"--rps <number>",
		"Requests per second per VU (default: 1000)",
		String(CONFIG.defaultRpsPerVu),
	)
	.action(async (options) => {
		try {
			validateTarget(options.target);
			validateMethod(options.method || "GET");

			if (!validateDuration(options.duration)) {
				throw new Error(
					`Invalid duration: '${options.duration}'. Expected format like 30s, 5m, or 1h.`,
				);
			}

			const vus = parseInt(options.vus, 10);
			if (!validateVUs(vus)) {
				throw new Error(
					`Invalid VUs: '${options.vus}'. Must be a positive integer.`,
				);
			}

			if (options.proxy) {
				validateProxy(options.proxy);
			}

			let proxyList: string[] = [];
			if (options.proxyFile) {
				const proxyFilePath = options.proxyFile as string;
				if (!fs.existsSync(proxyFilePath)) {
					throw new Error(`Proxy file not found: '${proxyFilePath}'`);
				}
				proxyList = fs
					.readFileSync(proxyFilePath, "utf-8")
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line && line.length > 0 && !line.startsWith("#"));
				for (const p of proxyList) {
					validateProxy(p);
				}
				if (proxyList.length === 0) {
					throw new Error(`Proxy file is empty: '${proxyFilePath}'`);
				}
			}

			const iterations = options.iterations
				? parseInt(options.iterations, 10)
				: 0;

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
				proxyList,
				origin: options.origin || "",
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
			if (attackOpts.proxyList.length > 0) {
				logger.info(
					`Proxy rotation: ${attackOpts.proxyList.length} proxies loaded`,
				);
			}
			if (attackOpts.origin) {
				logger.info(`Origin bypass: routing directly to ${attackOpts.origin}`);
			}

			logger.info(`Target: ${attackOpts.target}`);
			logger.info(`Scenario: ${attackOpts.scenario}`);
			logger.info(
				`VUs: ${attackOpts.vus} | Duration: ${attackOpts.duration} | RPS/VU: ${attackOpts.rpsPerVu}`,
			);

			const runner = new K6Runner();
			const script = runner.compileScript(attackOpts);
			await runner.execute(script, attackOpts);

			const config = loadConfig();
			config.lastTarget = attackOpts.target;
			saveConfig(config);
		} catch (err: unknown) {
			logger.error(
				`Attack failed: ${err instanceof Error ? err.message : String(err)}`,
			);
			process.exit(1);
		}
	});
