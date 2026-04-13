import https from "node:https";
import http from "node:http";
import { logger } from "./logger.js";

export interface FetchOptions {
	verbose?: boolean;
	insecure?: boolean;
}

export function fetchWithNode(
	url: string,
	options: FetchOptions = {},
): Promise<string | null> {
	return new Promise((resolve) => {
		const parsedUrl = new URL(url);
		const isHttps = parsedUrl.protocol === "https:";
		const client = isHttps ? https : http;

		const requestOptions: https.RequestOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || (isHttps ? 443 : 80),
			path: parsedUrl.pathname + parsedUrl.search,
			method: "GET",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
				Connection: "keep-alive",
			},
			timeout: 10000,
		};

		if (options.insecure && isHttps) {
			requestOptions.rejectUnauthorized = false;
		}

		const req = client.request(requestOptions, (res) => {
			// Handle redirects
			if (
				res.statusCode &&
				res.statusCode >= 300 &&
				res.statusCode < 400 &&
				res.headers.location
			) {
				const redirectUrl = new URL(res.headers.location, url).href;
				fetchWithNode(redirectUrl, options).then(resolve);
				return;
			}

			if (res.statusCode && res.statusCode >= 400) {
				if (options.verbose) {
					logger.warn(`HTTP ${res.statusCode} for ${url}`);
				}
				resolve(null);
				return;
			}

			let data = "";
			res.on("data", (chunk) => {
				data += chunk;
			});
			res.on("end", () => {
				resolve(data);
			});
		});

		req.on("error", (err) => {
			if (options.verbose) {
				logger.warn(`Fetch error for ${url}: ${err.message}`);
			}
			resolve(null);
		});

		req.on("timeout", () => {
			req.destroy();
			if (options.verbose) {
				logger.warn(`Timeout for ${url}`);
			}
			resolve(null);
		});

		req.end();
	});
}
