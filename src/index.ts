#!/usr/bin/env node
import { Command } from "commander";
import { attackCommand } from "./commands/attack.js";
import { reportCommand } from "./commands/report.js";
import { configCommand } from "./commands/config.js";

const program = new Command();

program
  .name("oura")
  .description("CLI tool for stress-testing web targets using k6")
  .version("1.0.0");

program.addCommand(attackCommand);
program.addCommand(reportCommand);
program.addCommand(configCommand);

program.parse();