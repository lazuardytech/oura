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
}

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "../utils/logger.js";
import { bombardTemplate } from "./templates/bombard.js";
import { rampingTemplate } from "./templates/ramping.js";
import { soakTemplate } from "./templates/soak.js";

const execFileAsync = promisify(execFile);
const SCRIPTS_DIR = path.join(os.homedir(), ".oura", "scripts");

export class K6Runner {
  private templates: Record<string, (opts: AttackOptions) => string>;

  constructor() {
    this.templates = {
      bombard: bombardTemplate,
      ramping: rampingTemplate,
      soak: soakTemplate,
    };
  }

  compileScript(options: AttackOptions): string {
    const templateFn = this.templates[options.scenario];
    if (!templateFn) {
      throw new Error(`Unknown scenario: ${options.scenario}. Available: bombard, ramping, soak`);
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

    try {
      const { stdout, stderr } = await execFileAsync(k6Path, args, {
        maxBuffer: 50 * 1024 * 1024,
      });

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (err: any) {
      if (err.killed) {
        logger.error("k6 process was killed (timeout or signal)");
      } else {
        if (err.stdout) console.log(err.stdout);
        if (err.stderr) console.error(err.stderr);
        logger.error(`k6 exited with code ${err.code || "unknown"}`);
      }
    } finally {
      try {
        fs.unlinkSync(scriptPath);
      } catch {}
    }
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
        "k6 not found. Install it from https://k6.io/docs/get-started/installation/"
      );
    }
  }
}