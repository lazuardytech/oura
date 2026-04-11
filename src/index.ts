#!/usr/bin/env node
import { Command } from "commander";
import { attackCommand } from "./commands/attack.js";
import { reportCommand } from "./commands/report.js";
import { configCommand } from "./commands/config.js";
import { scanCommand } from "./commands/scan.js";

const program = new Command();

program
	.name("oura")
	.description("CLI tool for stress-testing web targets using k6")
	.version("1.1.6", "-v, --version", "Show version number");

// Add help option explicitly
program.helpOption("-h, --help", "Show help information");

program.addCommand(attackCommand);
program.addCommand(reportCommand);
program.addCommand(configCommand);
program.addCommand(scanCommand);

// Show help if no command provided
if (process.argv.length === 2) {
	program.help();
}

program.parse();
