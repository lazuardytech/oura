import { AttackOptions } from "../runner.js";

export function rampingTemplate(opts: AttackOptions): string {
  const rampStages = parseRampUp(opts.rampUp, opts.vus);

  const headersStr = Object.entries(opts.headers)
    .map(([k, v]) => `"${k}": "${v}"`)
    .join(", ");

  const checkBlock = opts.noCheck
    ? ""
    : `check(res, {
    "status was 200": (r) => r.status === 200,
  });`;

  return `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: ${JSON.stringify(rampStages, null, 2)},
};

const TARGET = "${opts.target}";
const METHOD = "${opts.method}";
const HEADERS = { ${headersStr || '"User-Agent": "oura/1.0"'} };
const PAYLOAD = ${opts.payload ? `\`${opts.payload}\`` : "null"};

export default function () {
  let res;
  const params = { headers: HEADERS };

  if (PAYLOAD) {
    res = http.${opts.method.toLowerCase()}(TARGET, PAYLOAD, params);
  } else {
    res = http.${opts.method.toLowerCase()}(TARGET, params);
  }

  ${checkBlock}
  sleep(1);
}
`;
}

function parseRampUp(rampStr: string, defaultVus: number): Array<{ duration: string; target: number }> {
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