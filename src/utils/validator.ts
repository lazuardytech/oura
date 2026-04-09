export function validateTarget(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}. Use http or https.`);
  }

  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    throw new Error(
      "Targeting localhost is not allowed. Use a valid external target."
    );
  }
}

export function validateDuration(duration: string): boolean {
  return /^\d+(\.\d+)?(s|m|h)$/.test(duration);
}

export function validateVUs(vus: number): boolean {
  return Number.isInteger(vus) && vus > 0;
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)(s|m|h)$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    default: return 0;
  }
}

export interface ParsedThreshold {
  metric: string;
  condition: string;
}

export function parseThreshold(threshold: string): ParsedThreshold {
  const colonIndex = threshold.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid threshold format: '${threshold}'. Expected 'metric:condition' (e.g., 'http_req_duration:p(95)<500')`);
  }
  const metric = threshold.slice(0, colonIndex);
  const condition = threshold.slice(colonIndex + 1);
  if (!metric || !condition) {
    throw new Error(`Invalid threshold format: '${threshold}'. Both metric and condition must be non-empty.`);
  }
  return { metric, condition };
}

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"] as const;

export function validateMethod(method: string): void {
  if (!ALLOWED_METHODS.includes(method.toUpperCase() as any)) {
    throw new Error(`Invalid HTTP method: ${method}. Allowed methods: ${ALLOWED_METHODS.join(", ")}`);
  }
}

export function validateProxy(proxyUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    throw new Error(`Invalid proxy URL: ${proxyUrl}. Expected format: http://host:port or https://host:port or socks5://host:port`);
  }

  const validProtocols = ["http:", "https:", "socks5:", "socks5h:"];
  if (!validProtocols.includes(parsed.protocol)) {
    throw new Error(`Unsupported proxy protocol: ${parsed.protocol}. Use http, https, socks5, or socks5h.`);
  }

  if (!parsed.hostname) {
    throw new Error("Proxy URL must include a hostname.");
  }

  if (!parsed.port) {
    throw new Error(`Proxy URL must include a port. Example: ${parsed.protocol}//${parsed.hostname}:8080`);
  }
}