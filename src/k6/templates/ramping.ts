import type { AttackOptions } from "../runner.js";
import { sanitizeForScript } from "../../utils/sanitizer.js";
import { generateStealthHelpersScript } from "./utils/stealth.js";

function buildThresholds(opts: AttackOptions): string {
	if (!opts.thresholds || opts.thresholds.length === 0) return "";
	const grouped: Record<string, string[]> = {};
	for (const t of opts.thresholds) {
		const colonIndex = t.indexOf(":");
		if (colonIndex === -1) continue;
		const metric = t.slice(0, colonIndex);
		const condition = t.slice(colonIndex + 1);
		if (!grouped[metric]) grouped[metric] = [];
		grouped[metric].push(condition);
	}
	const lines = Object.entries(grouped).map(([metric, conditions]) => {
		const conditionsStr = conditions.map((c) => JSON.stringify(c)).join(", ");
		return `    "${metric}": [${conditionsStr}]`;
	});
	return `,\n  thresholds: {\n${lines.join(",\n")}\n  }`;
}

export function rampingTemplate(opts: AttackOptions): string {
	const rampStages = parseRampUp(opts.rampUp, opts.vus);

	const headersStr = Object.entries(opts.headers)
		.map(([k, v]) => `${sanitizeForScript(k)}: ${sanitizeForScript(v)}`)
		.join(", ");

	const checkBlock = opts.noCheck
		? ""
		: `check(res, {
    "status was 200": (r) => r.status === 200,
  });`;

	const stealthBlock = opts.stealth
		? `${generateStealthHelpersScript()}
const BASE_HEADERS = { ${headersStr || `${sanitizeForScript("User-Agent")}: ${sanitizeForScript("oura/1.0")}`} };

export default function () {
  const stealthHeaders = generateStealthHeaders();
  const mergedHeaders = Object.assign({}, BASE_HEADERS, stealthHeaders);
  let res;
  const params = { headers: mergedHeaders };

  if (PAYLOAD) {
    res = http[METHOD](TARGET, PAYLOAD, params);
  } else {
    res = http[METHOD](TARGET, params);
  }

  if (!handleBackoff(res)) {
    ${checkBlock}
    stealthSleep();
  }
}`
		: `const HEADERS = { ${headersStr || `${sanitizeForScript("User-Agent")}: ${sanitizeForScript("oura/1.0")}`} };

export default function () {
  let res;
  const params = { headers: HEADERS };

  if (PAYLOAD) {
    res = http[METHOD](TARGET, PAYLOAD, params);
  } else {
    res = http[METHOD](TARGET, params);
  }

  ${checkBlock}
  sleep(1);
}`;

	const iterationsBlock =
		opts.iterations > 0 ? `,\n  iterations: ${opts.iterations},` : "";

	return `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: ${JSON.stringify(rampStages, null, 2)},${iterationsBlock}${buildThresholds(opts)}
};

const TARGET = ${sanitizeForScript(opts.target)};
const METHOD = ${sanitizeForScript(opts.method.toLowerCase())};
const PAYLOAD = ${opts.payload ? sanitizeForScript(opts.payload) : "null"};

${stealthBlock}
`;
}

function parseRampUp(
	rampStr: string,
	defaultVus: number,
): Array<{ duration: string; target: number }> {
	if (!rampStr) {
		return [
			{ duration: "10s", target: Math.floor(defaultVus * 0.1) },
			{ duration: "20s", target: defaultVus },
			{ duration: "10s", target: defaultVus },
			{ duration: "10s", target: 0 },
		];
	}

	return rampStr.split(",").map((stage) => {
		const [target, duration] = stage.trim().split(":");
		return { duration, target: parseInt(target, 10) };
	});
}
