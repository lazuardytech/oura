import { AttackOptions } from "../runner.js";
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
    const conditionsStr = conditions.map(c => JSON.stringify(c)).join(", ");
    return `    "${metric}": [${conditionsStr}]`;
  });
  return `,\n  thresholds: {\n${lines.join(",\n")}\n  }`;
}

function buildSoakStages(vus: number, durationStr: string): Array<{ duration: string; target: number }> {
  const totalSeconds = parseDuration(durationStr);

  if (totalSeconds <= 0) {
    return defaultSoakStages(vus);
  }

  const proportionRamp50 = 0.10;
  const proportionHold50 = 0.20;
  const proportionRamp75 = 0.10;
  const proportionHold75 = 0.20;
  const proportionRamp100 = 0.10;
  const proportionHold100 = 0.20;
  const proportionRampDown = 0.10;

  function fmt(seconds: number): string {
    if (seconds >= 60 && seconds % 60 === 0) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds)}s`;
  }

  return [
    { duration: fmt(totalSeconds * proportionRamp50), target: Math.floor(vus * 0.5) },
    { duration: fmt(totalSeconds * proportionHold50), target: Math.floor(vus * 0.5) },
    { duration: fmt(totalSeconds * proportionRamp75), target: Math.floor(vus * 0.75) },
    { duration: fmt(totalSeconds * proportionHold75), target: Math.floor(vus * 0.75) },
    { duration: fmt(totalSeconds * proportionRamp100), target: vus },
    { duration: fmt(totalSeconds * proportionHold100), target: vus },
    { duration: fmt(totalSeconds * proportionRampDown), target: 0 },
  ];
}

function defaultSoakStages(vus: number): Array<{ duration: string; target: number }> {
  return [
    { duration: "2m", target: Math.floor(vus * 0.5) },
    { duration: "5m", target: Math.floor(vus * 0.5) },
    { duration: "2m", target: Math.floor(vus * 0.75) },
    { duration: "5m", target: Math.floor(vus * 0.75) },
    { duration: "2m", target: vus },
    { duration: "5m", target: vus },
    { duration: "3m", target: 0 },
  ];
}

export function soakTemplate(opts: AttackOptions): string {
  const stages = buildSoakStages(opts.vus, opts.duration);

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
  sleep(1);
}`;

  const iterationsBlock = opts.iterations > 0
    ? `,\n  iterations: ${opts.iterations},`
    : "";

  return `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: ${JSON.stringify(stages, null, 2)},${iterationsBlock}${buildThresholds(opts)}
};

const TARGET = ${sanitizeForScript(opts.target)};
const METHOD = ${sanitizeForScript(opts.method.toLowerCase())};
const PAYLOAD = ${opts.payload ? sanitizeForScript(opts.payload) : "null"};

${stealthBlock}
`;
}