export interface AttackOptions {
	target: string;
	method: string;
	vus: number;
	duration: string;
	scenario: string;
	payload: string;
	headers: Record<string, string>;
	rampUp: string;
	output: string;
	noCheck: boolean;
	stealth: boolean;
	proxy: string;
	proxyList: string[];
	origin: string;
	thresholds: string[];
	iterations: number;
	rpsPerVu: number;
	scanUrl: string;
}

import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "../utils/logger.js";
import { bombardTemplate } from "./templates/bombard.js";
import { rampingTemplate } from "./templates/ramping.js";
import { soakTemplate } from "./templates/soak.js";
import { stealthTemplate } from "./templates/stealth.js";
import { formFloodTemplate } from "./templates/form-flood.js";
import { scanFormFields } from "./templates/utils/form-scanner.js";

const execFileAsync = promisify(execFile);
const SCRIPTS_DIR = path.join("/tmp", ".oura", "scripts");

export class K6Runner {
	private templates: Record<string, (opts: AttackOptions) => string>;

	constructor() {
		this.templates = {
			bombard: bombardTemplate,
			ramping: rampingTemplate,
			soak: soakTemplate,
			stealth: stealthTemplate,
		};
	}

	async compileScript(options: AttackOptions): Promise<string> {
		if (options.scenario === "form-flood") {
			const scanTarget = options.scanUrl || options.target;
			const scannedForm = await scanFormFields(scanTarget);
			return formFloodTemplate(options, scannedForm.fields);
		}

		const templateFn = this.templates[options.scenario];
		if (!templateFn) {
			throw new Error(
				`Unknown scenario: ${options.scenario}. Available: bombard, ramping, soak, stealth, form-flood`,
			);
		}
		return templateFn(options);
	}

	async execute(script: string, options: AttackOptions): Promise<void> {
		const k6Path = await this.findK6();

		if (!fs.existsSync(SCRIPTS_DIR)) {
			fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
		}

		const scriptPath = path.join(SCRIPTS_DIR, `attack-${Date.now()}.js`);
		fs.writeFileSync(scriptPath, script);
		logger.info(`Script written to ${scriptPath}`);

		const args: string[] = ["run", scriptPath, "--no-usage-report"];

		if (options.output) {
			const outputPath = path.resolve(options.output);
			args.push("--summary-export", outputPath);
		}

		// Print oura ASCII art banner
		console.log("   ____   _    _   ____       _");
		console.log("  / __ \\ | |  | | |  _ \\     / \\ ");
		console.log(" | |  | || |  | | | |_) |   / _ \\ ");
		console.log(" | |  | || |  | | |  _ <   / ___ \\ ");
		console.log("  \\____/  \\____/  |_| \\_\\ /_/   \\_\\ ");
		console.log("");

		logger.info("Launching attack...");

		const env: Record<string, string> = {
			...(process.env as Record<string, string>),
		};
		if (options.proxy) {
			env.HTTP_PROXY = options.proxy;
			env.HTTPS_PROXY = options.proxy;
		}

		if (options.proxyList.length > 0) {
			env.PROXY_LIST = JSON.stringify(options.proxyList);
		}

		return new Promise<void>((resolve, reject) => {
			const child = spawn(k6Path, args, { env });

			// Helper function to filter k6 Grafana banner from output
			const filterOutput = (data: Buffer, output: NodeJS.WriteStream) => {
				const lines = data.toString().split("\n");
				let inBanner = false;
				let bannerLineCount = 0;

				for (const line of lines) {
					// Detect start of banner (Grafana text)
					if (line.includes("Grafana")) {
						inBanner = true;
						bannerLineCount = 0;
						continue;
					}

					// If in banner mode, count lines and skip ASCII art
					if (inBanner) {
						bannerLineCount++;
						// Check if line is ASCII art (mostly special chars)
						const cleanLine = line.replace(/\s/g, "");
						const isAsciiArt =
							cleanLine.length > 0 && /^[\\/_|‾\-()]+$/.test(cleanLine);

						// Exit banner mode after 6-8 lines of ASCII art or empty line
						if (
							bannerLineCount > 8 ||
							(line.trim() === "" && bannerLineCount > 5)
						) {
							inBanner = false;
							continue;
						}

						if (isAsciiArt || line.trim() === "") {
							continue;
						}
						inBanner = false;
					}

					// Write non-banner lines (avoid double newlines)
					const lineToWrite = line.endsWith("\n") ? line : `${line}\n`;
					output.write(lineToWrite);
				}
			};

			child.stdout.on("data", (data: Buffer) => {
				filterOutput(data, process.stdout);
			});

			child.stderr.on("data", (data: Buffer) => {
				filterOutput(data, process.stderr);
			});

			child.on("close", (code: number | null, signal: string | null) => {
				try {
					fs.unlinkSync(scriptPath);
				} catch {}

				if (signal) {
					reject(new Error(`k6 process was killed by signal ${signal}`));
				} else if (code !== null && code !== 0) {
					reject(new Error(`k6 exited with code ${code}`));
				} else {
					resolve();
				}
			});

			child.on("error", (err: Error) => {
				try {
					fs.unlinkSync(scriptPath);
				} catch {}
				reject(err);
			});
		});
	}

	private async findK6(): Promise<string> {
		try {
			await execFileAsync("k6", ["version"]);
			return "k6";
		} catch {
			const commonPaths = [
				"/usr/local/bin/k6",
				"/usr/bin/k6",
				path.join(os.homedir(), ".local", "bin", "k6"),
			];
			for (const p of commonPaths) {
				if (fs.existsSync(p)) return p;
			}
			throw new Error(
				"k6 not found. Install it from https://k6.io/docs/get-started/installation/",
			);
		}
	}
}
