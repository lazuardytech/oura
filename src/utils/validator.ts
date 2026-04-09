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