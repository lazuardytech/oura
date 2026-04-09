const chalk = {
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
	gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export const logger = {
	info: (msg: string) => console.log(`${chalk.cyan("▸")} ${msg}`),
	success: (msg: string) => console.log(`${chalk.green("✓")} ${msg}`),
	warn: (msg: string) => console.log(`${chalk.yellow("⚠")} ${msg}`),
	error: (msg: string) => console.error(`${chalk.red("✗")} ${msg}`),
	raw: (msg: string) => console.log(msg),
};
