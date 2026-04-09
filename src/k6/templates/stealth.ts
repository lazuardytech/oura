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

export function stealthTemplate(opts: AttackOptions): string {
	const headersStr = Object.entries(opts.headers)
		.map(([k, v]) => `${sanitizeForScript(k)}: ${sanitizeForScript(v)}`)
		.join(", ");

	const checkBlock = opts.noCheck
		? ""
		: `if (res.status !== 429) {
      check(res, {
        "status was 200": (r) => r.status === 200,
      });
    }`;

	const iterationsBlock =
		opts.iterations > 0 ? `,\n  iterations: ${opts.iterations},` : "";

	return `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: ${Math.floor(opts.vus * 0.1)} },
    { duration: "1m", target: ${opts.vus} },
    { duration: "30s", target: 0 },
  ],${iterationsBlock}${buildThresholds(opts)}
};

${generateStealthHelpersScript()}
const BASE_HEADERS = { ${headersStr || '""'} };
const TARGET = ${sanitizeForScript(opts.target)};
const METHOD = ${sanitizeForScript(opts.method.toLowerCase())};
const PAYLOAD = ${opts.payload ? sanitizeForScript(opts.payload) : "null"};

export default function () {
  const stealthHeaders = generateStealthHeaders();
  const mergedHeaders = Object.assign({}, BASE_HEADERS, stealthHeaders);
  const params = { headers: mergedHeaders };

  let res;
  if (PAYLOAD) {
    res = http[METHOD](TARGET, PAYLOAD, params);
  } else {
    res = http[METHOD](TARGET, params);
  }

  if (!handleBackoff(res)) {
    ${checkBlock}
  }
}
`;
}
