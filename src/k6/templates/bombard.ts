import { AttackOptions } from "../runner.js";
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
    const conditionsStr = conditions.map(c => JSON.stringify(c)).join(", ");
    return `    "${metric}": [${conditionsStr}]`;
  });
  return `,\n    thresholds: {\n${lines.join(",\n")}\n    }`;
}

export function bombardTemplate(opts: AttackOptions): string {
  const headersStr = Object.entries(opts.headers)
    .map(([k, v]) => `${sanitizeForScript(k)}: ${sanitizeForScript(v)}`)
    .join(", ");

  const checkBlock = opts.noCheck
    ? ""
    : `check(res, {
    "status was 200": (r) => r.status === 200,
  });`;

  const totalRate = opts.vus * opts.rpsPerVu;

  const stealthBlock = opts.stealth
    ? `${generateStealthHelpersScript()}
const BASE_HEADERS = { ${headersStr || sanitizeForScript("User-Agent") + ": " + sanitizeForScript("oura/1.0")} };

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
    : `const HEADERS = { ${headersStr || sanitizeForScript("User-Agent") + ": " + sanitizeForScript("oura/1.0")} };

export default function () {
  let res;
  const params = { headers: HEADERS };

  if (PAYLOAD) {
    res = http[METHOD](TARGET, PAYLOAD, params);
  } else {
    res = http[METHOD](TARGET, params);
  }

  ${checkBlock}
}`;

  const optionsBlock = opts.iterations > 0
    ? `  scenarios: {
    bombard: {
      executor: "constant-arrival-rate",
      rate: ${totalRate},
      timeUnit: "1s",
      duration: ${sanitizeForScript(opts.duration)},
      preAllocatedVUs: ${opts.vus},
      maxVUs: ${Math.max(opts.vus, Math.ceil(totalRate / 100))},
    },
  },`
    : `  scenarios: {
    bombard: {
      executor: "constant-arrival-rate",
      rate: ${totalRate},
      timeUnit: "1s",
      duration: ${sanitizeForScript(opts.duration)},
      preAllocatedVUs: ${opts.vus},
      maxVUs: ${Math.max(opts.vus, Math.ceil(totalRate / 100))},
    },
  },`;

  const thresholdBlock = buildThresholds(opts);

  return `import http from "k6/http";
import { check } from "k6";

export const options = {
${optionsBlock}${thresholdBlock}
};

const TARGET = ${sanitizeForScript(opts.target)};
const METHOD = ${sanitizeForScript(opts.method.toLowerCase())};
const PAYLOAD = ${opts.payload ? sanitizeForScript(opts.payload) : "null"};

${stealthBlock}
`;
}