import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "../utils/logger.js";

const CONFIG_DIR = path.join(os.homedir(), ".oura");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface Config {
	k6Path: string;
	defaultVus: number;
	defaultDuration: string;
	defaultScenario: string;
	defaultRpsPerVu: number;
	lastTarget: string;
}

const defaultConfig: Config = {
	k6Path: "k6",
	defaultVus: 100,
	defaultDuration: "30s",
	defaultScenario: "bombard",
	defaultRpsPerVu: 1000,
	lastTarget: "",
};

export function loadConfig(): Config {
	if (!fs.existsSync(CONFIG_FILE)) {
		return { ...defaultConfig };
	}
	const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
	return { ...defaultConfig, ...JSON.parse(raw) };
}

export function saveConfig(config: Config) {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export const configCommand = new Command("config")
	.description("Manage oura configuration")
	.addCommand(
		new Command("show").action(() => {
			const config = loadConfig();
			console.log(JSON.stringify(config, null, 2));
		}),
	)
	.addCommand(
		new Command("set")
			.argument("<key>", "Config key")
			.argument("<value>", "Config value")
			.action((key: string, value: string) => {
				const config = loadConfig();
				if (!(key in config)) {
					logger.error(`Unknown config key: ${key}`);
					logger.info(`Valid keys: ${Object.keys(config).join(", ")}`);
					process.exit(1);
				}
				(config as unknown as Record<string, string | number>)[key] =
					Number.isNaN(Number(value)) ? value : Number(value);
				saveConfig(config);
				logger.info(
					`Set ${key} = ${(config as unknown as Record<string, string | number>)[key]}`,
				);
			}),
	)
	.addCommand(
		new Command("reset").action(() => {
			saveConfig(defaultConfig);
			logger.info("Configuration reset to defaults.");
		}),
	);
