import { Command } from "commander";
import { fetchWithNode } from "../utils/fetcher.js";
import { logger } from "../utils/logger.js";
import { validateTarget } from "../utils/validator.js";

interface ScanResult {
	apis: Set<string>;
	webhooks: Set<string>;
	websockets: Set<string>;
	sse: Set<string>;
	graphql: Set<string>;
}

const API_PATTERNS = [
	// fetch patterns
	/fetch\s*\(\s*["'`]([^"'`]+)["'`]/g,
	/fetch\s*\(\s*`([^`]+)`/g,
	// fetch with string concatenation (bundled JS pattern)
	/fetch\s*\(\s*["'`]\.concat\s*\(\s*["'`]([^"'`]+)["'`]/g,
	/fetch\s*\(\s*[^)]*\.concat\s*\(\s*["'`]([^"'`]+)["'`]/g,
	// axios patterns
	/axios\.[getpostputdeletepatch]+\s*\(\s*["'`]([^"'`]+)["'`]/gi,
	/axios\s*\(\s*\{[^}]*url\s*:\s*["'`]([^"'`]+)["'`]/gi,
	// XMLHttpRequest patterns
	/\.open\s*\(\s*["'`][^"'`]*["'`]\s*,\s*["'`]([^"'`]+)["'`]/gi,
	// jQuery AJAX patterns
	/\$\.ajax\s*\(\s*\{[^}]*url\s*:\s*["'`]([^"'`]+)["'`]/gi,
	/\$\.[getpost]+\s*\(\s*["'`]([^"'`]+)["'`]/gi,
	// Next.js / React environment variable patterns
	/process\.env\.(?:NEXT_PUBLIC_)?[A-Z_]*(?:URL|URI|ENDPOINT|API)[^"'`]*["'`]([^"'`]+)["'`]/gi,
	// String concatenation patterns for API URLs (minified JS)
	/"(https?:\/\/[^"]+)"\.concat\s*\(/gi,
	/'(https?:\/\/[^']+)'\.concat\s*\(/gi,
	// Direct full URL patterns for common API domains
	/["'`](https?:\/\/api\.[^"'`/]+\/[^"'`]+)["'`]/gi,
	/["'`](https?:\/\/[^"'`/]*api[^"'`/]*\/[^"'`]+)["'`]/gi,
	// Generic API patterns for common paths
	/["'`](\/api\/[^"'`]+)["'`]/g,
	/["'`](\/v\d+\/[^"'`]+)["'`]/g,
	/["'`](\/graphql[^"'`]*)["'`]/gi,
	/["'`](\/rest\/[^"'`]+)["'`]/g,
	/["'`](\/json\/[^"'`]+)["'`]/g,
	// Webhook patterns
	/["'`]([^"'`]*\/webhook[^"'`]*)["'`]/gi,
	/["'`](https?:\/\/[^"'`]*webhook[^"'`]*\/[^"'`]+)["'`]/gi,
	/["'`](\/hook\/[^"'`]+)["'`]/gi,
	/["'`](\/callback\/[^"'`]+)["'`]/gi,
	/["'`](\/event\/[^"'`]+)["'`]/gi,
	/["'`](\/trigger\/[^"'`]+)["'`]/gi,
	// Base URL patterns for API construction
	/["'`](https?:\/\/api\.[^"'`]+)\/[^"'`]*["'`]/gi,
];

const WS_PATTERNS = [
	// WebSocket patterns
	/new\s+WebSocket\s*\(\s*["'`]([^"'`]+)["'`]/gi,
	/new\s+WebSocket\s*\(\s*`([^`]+)`/gi,
	/ws:\/\/[^\s"'`]+/gi,
	/wss:\/\/[^\s"'`]+/gi,
];

const SSE_PATTERNS = [
	// Server-Sent Events patterns
	/new\s+EventSource\s*\(\s*["'`]([^"'`]+)["'`]/gi,
	/new\s+EventSource\s*\(\s*`([^`]+)`/gi,
];

const GRAPHQL_PATTERNS = [
	// GraphQL patterns
	/["'`]([^"'`]*graphql[^"'`]*)["'`]/gi,
	/query\s*[:=]\s*["'`][^"'`]*["'`]/gi,
	/mutation\s*[:=]\s*["'`][^"'`]*["'`]/gi,
	/subscription\s*[:=]\s*["'`][^"'`]*["'`]/gi,
];

function extractUrls(html: string, baseUrl: string): string[] {
	const urls: string[] = [];

	// Extract src attributes from script tags
	const srcPattern = /<script[^>]*src\s*=\s*["'`]([^"'`]+)["'`][^>]*>/gi;
	let match: RegExpExecArray | null = srcPattern.exec(html);

	while (match !== null) {
		try {
			const url = new URL(match[1], baseUrl).href;
			urls.push(url);
		} catch {
			// Invalid URL, skip
		}
		match = srcPattern.exec(html);
	}

	// Also look for module imports
	const importPattern = /import\s+[^'"]*['"]([^'"]+)['"]/g;
	match = importPattern.exec(html);
	while (match !== null) {
		if (
			match[1].endsWith(".js") ||
			match[1].endsWith(".mjs") ||
			match[1].endsWith(".ts")
		) {
			try {
				const url = new URL(match[1], baseUrl).href;
				urls.push(url);
			} catch {
				// Invalid URL, skip
			}
		}
		match = importPattern.exec(html);
	}

	return [...new Set(urls)];
}

function findPatternMatches(pattern: RegExp, content: string): string[] {
	const matches: string[] = [];
	let match: RegExpExecArray | null = pattern.exec(content);
	while (match !== null) {
		if (match[1]) {
			matches.push(match[1]);
		}
		match = pattern.exec(content);
	}
	return matches;
}

// Webhook detection patterns
const WEBHOOK_KEYWORDS = [
	"/webhook",
	"/hook/",
	"/callback/",
	"/trigger/",
	"webhook",
];

function isWebhookUrl(url: string): boolean {
	return WEBHOOK_KEYWORDS.some((keyword) =>
		url.toLowerCase().includes(keyword.toLowerCase()),
	);
}

function analyzeContent(content: string, baseUrl: string): Partial<ScanResult> {
	const apis = new Set<string>();
	const webhooks = new Set<string>();
	const websockets = new Set<string>();
	const sse = new Set<string>();
	const graphql = new Set<string>();

	// Find API endpoints
	for (const pattern of API_PATTERNS) {
		const matches = findPatternMatches(pattern, content);
		for (const endpoint of matches) {
			if (!endpoint) continue;

			// Normalize the endpoint
			let fullUrl: string | null = null;
			if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
				fullUrl = endpoint;
			} else if (endpoint.startsWith("/")) {
				try {
					fullUrl = new URL(endpoint, baseUrl).href;
				} catch {
					fullUrl = endpoint;
				}
			} else if (
				!endpoint.startsWith("data:") &&
				!endpoint.startsWith("blob:")
			) {
				// Relative path
				try {
					fullUrl = new URL(endpoint, baseUrl).href;
				} catch {
					fullUrl = endpoint;
				}
			}

			if (fullUrl) {
				// Separate webhooks from regular APIs
				if (isWebhookUrl(fullUrl)) {
					webhooks.add(fullUrl);
				} else {
					apis.add(fullUrl);
				}
			}
		}
	}

	// Find WebSocket endpoints
	for (const pattern of WS_PATTERNS) {
		const matches = findPatternMatches(pattern, content);
		for (const endpoint of matches) {
			if (!endpoint) continue;

			if (endpoint.startsWith("ws://") || endpoint.startsWith("wss://")) {
				websockets.add(endpoint);
			} else if (!endpoint.includes(" ")) {
				// Try to construct WS URL from base
				try {
					const _wsProtocol = baseUrl.startsWith("https") ? "wss:" : "ws:";
					const baseWs = baseUrl.replace(/^http/, "ws");
					const fullUrl = new URL(endpoint, `${baseWs}/`).href;
					if (fullUrl.startsWith("ws://") || fullUrl.startsWith("wss://")) {
						websockets.add(fullUrl);
					}
				} catch {
					// Skip if can't construct
				}
			}
		}
		// Also capture direct ws:// matches from the regex
		const wsDirectMatches = content.match(pattern);
		if (wsDirectMatches) {
			for (const m of wsDirectMatches) {
				if (m.startsWith("ws://") || m.startsWith("wss://")) {
					websockets.add(m);
				}
			}
		}
	}

	// Find SSE endpoints
	for (const pattern of SSE_PATTERNS) {
		const matches = findPatternMatches(pattern, content);
		for (const endpoint of matches) {
			if (!endpoint) continue;

			if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
				sse.add(endpoint);
			} else {
				try {
					const fullUrl = new URL(endpoint, baseUrl).href;
					sse.add(fullUrl);
				} catch {
					sse.add(endpoint);
				}
			}
		}
	}

	// Find GraphQL indicators
	for (const pattern of GRAPHQL_PATTERNS) {
		const matches = findPatternMatches(pattern, content);
		for (const endpoint of matches) {
			if (!endpoint || endpoint.length >= 500) continue; // Filter out very long matches

			if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
				graphql.add(endpoint);
			} else if (endpoint.includes("/")) {
				try {
					const fullUrl = new URL(endpoint, baseUrl).href;
					graphql.add(fullUrl);
				} catch {
					graphql.add(endpoint);
				}
			}
		}
	}

	return { apis, webhooks, websockets, sse, graphql };
}

async function fetchUrl(
	url: string,
	verbose = false,
	insecure = false,
): Promise<string | null> {
	return fetchWithNode(url, { verbose, insecure });
}

export const scanCommand = new Command("scan")
	.description("Scan a frontend URL for API and WebSocket usage")
	.requiredOption("-t, --target <url>", "Target URL to scan")
	.option(
		"-k, --insecure",
		"Allow insecure SSL connections (skip certificate validation)",
		false,
	)
	.action(async (options) => {
		try {
			validateTarget(options.target);

			// Print oura ASCII art banner
			console.log("   ____   _    _   ____       _");
			console.log("  / __ \\ | |  | | |  _ \\     / \\ ");
			console.log(" | |  | || |  | | | |_) |   / _ \\ ");
			console.log(" | |  | || |  | | |  _ <   / ___ \\ ");
			console.log("  \\____/  \\____/  |_| \\_\\ /_/   \\_\\ ");
			console.log("");

			logger.info(`Scanning target: ${options.target}`);

			const result: ScanResult = {
				apis: new Set(),
				webhooks: new Set(),
				websockets: new Set(),
				sse: new Set(),
				graphql: new Set(),
			};

			// Fetch the main page
			const html = await fetchUrl(options.target, true, options.insecure);
			if (!html) {
				logger.error("Failed to fetch target URL");
				logger.info("Possible causes:");
				logger.info("  • The URL may be unreachable or require authentication");
				logger.info("  • There may be network connectivity issues");
				logger.info("  • The site may block automated requests");
				logger.info(
					"  • SSL/TLS certificate issues (try using --insecure or -k flag)",
				);
				process.exit(1);
			}

			logger.info("Analyzing page content...");

			// Analyze inline scripts and HTML
			const inlineResults = analyzeContent(html, options.target);
			for (const api of inlineResults.apis ?? []) {
				result.apis.add(api);
			}
			for (const wh of inlineResults.webhooks ?? []) {
				result.webhooks.add(wh);
			}
			for (const ws of inlineResults.websockets ?? []) {
				result.websockets.add(ws);
			}
			for (const s of inlineResults.sse ?? []) {
				result.sse.add(s);
			}
			for (const g of inlineResults.graphql ?? []) {
				result.graphql.add(g);
			}

			// Extract and fetch external scripts
			const scriptUrls = extractUrls(html, options.target);
			if (scriptUrls.length > 0) {
				logger.info(`Found ${scriptUrls.length} external script(s) to analyze`);

				for (const scriptUrl of scriptUrls.slice(0, 20)) {
					// Limit to 20 scripts to avoid long scans
					const scriptContent = await fetchUrl(
						scriptUrl,
						false,
						options.insecure,
					);
					if (scriptContent) {
						const scriptResults = analyzeContent(scriptContent, options.target);
						for (const api of scriptResults.apis ?? []) {
							result.apis.add(api);
						}
						for (const wh of scriptResults.webhooks ?? []) {
							result.webhooks.add(wh);
						}
						for (const ws of scriptResults.websockets ?? []) {
							result.websockets.add(ws);
						}
						for (const s of scriptResults.sse ?? []) {
							result.sse.add(s);
						}
						for (const g of scriptResults.graphql ?? []) {
							result.graphql.add(g);
						}
					}
				}
			}

			// Display results
			console.log("\n");
			logger.info("=== Scan Results ===");

			let foundAny = false;

			// API Endpoints
			if (result.apis.size > 0) {
				foundAny = true;
				console.log("\n📡 API Endpoints Found:");
				console.log("─".repeat(50));
				for (const api of [...result.apis].sort()) {
					console.log(`  ${api}`);
				}
			}

			// Webhook Endpoints
			if (result.webhooks.size > 0) {
				foundAny = true;
				console.log("\n🪝 Webhook Endpoints Found:");
				console.log("─".repeat(50));
				for (const wh of [...result.webhooks].sort()) {
					console.log(`  ${wh}`);
				}
			}

			// WebSocket Endpoints
			if (result.websockets.size > 0) {
				foundAny = true;
				console.log("\n🔌 WebSocket Endpoints Found:");
				console.log("─".repeat(50));
				for (const ws of [...result.websockets].sort()) {
					console.log(`  ${ws}`);
				}
			}

			// Server-Sent Events
			if (result.sse.size > 0) {
				foundAny = true;
				console.log("\n📬 Server-Sent Events (SSE) Endpoints Found:");
				console.log("─".repeat(50));
				for (const s of [...result.sse].sort()) {
					console.log(`  ${s}`);
				}
			}

			// GraphQL Endpoints
			if (result.graphql.size > 0) {
				foundAny = true;
				console.log("\n⚛️  GraphQL Endpoints Found:");
				console.log("─".repeat(50));
				for (const g of [...result.graphql].sort()) {
					console.log(`  ${g}`);
				}
			}

			if (!foundAny) {
				console.log("\n");
				logger.warn("No API or WebSocket usage detected.");
				console.log("\nPossible reasons:");
				console.log(
					"  • The site may use dynamic JavaScript loading (SPA frameworks)",
				);
				console.log(
					"  • APIs might be loaded lazily or require user interaction",
				);
				console.log(
					"  • The site may use unconventional patterns not detected by static analysis",
				);
				console.log(
					"\nTip: Try using browser DevTools (Network tab) to inspect live traffic.",
				);
			} else {
				console.log("\n");
				logger.success(
					`Scan complete! Found ${result.apis.size} API(s), ${result.webhooks.size} Webhook(s), ${result.websockets.size} WebSocket(s), ${result.sse.size} SSE endpoint(s), ${result.graphql.size} GraphQL endpoint(s).`,
				);
			}
		} catch (err: unknown) {
			logger.error(
				`Scan failed: ${err instanceof Error ? err.message : String(err)}`,
			);
			process.exit(1);
		}
	});
