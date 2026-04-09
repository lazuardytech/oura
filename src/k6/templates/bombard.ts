import { AttackOptions } from "../runner.js";

export function bombardTemplate(opts: AttackOptions): string {
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
  vus: ${opts.vus},
  duration: "${opts.duration}",
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