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
import { formFlood1Template } from "./templates/form-flood-1.js";
import { formFlood2Template } from "./templates/form-flood-2.js";

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
			"form-flood-1": formFlood1Template,
			"form-flood-2": formFlood2Template,
		};
	}

	compileScript(options: AttackOptions): string {
		const templateFn = this.templates[options.scenario];
		if (!templateFn) {
			throw new Error(
				`Unknown scenario: ${options.scenario}. Available: bombard, ramping, soak, stealth, form-flood-1, form-flood-2`,
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

		const args: string[] = ["run", scriptPath];

		if (options.output) {
			const outputPath = path.resolve(options.output);
			args.push("--summary-export", outputPath);
		}

		logger.info("Launching k6...\n");

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

			child.stdout.on("data", (data: Buffer) => {
				process.stdout.write(data);
			});

			child.stderr.on("data", (data: Buffer) => {
				process.stderr.write(data);
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
