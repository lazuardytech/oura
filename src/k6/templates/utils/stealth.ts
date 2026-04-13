export const USER_AGENTS: string[] = [
	// Chrome (latest versions, most common)
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	// Firefox
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0",
	"Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
	// Safari
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
	// Edge
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Edg/124.0.0.0",
	// Mobile
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
	"Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
];

export const ACCEPT_HEADERS: string[] = [
	"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
	"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
	"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"application/json, text/plain, */*",
	"application/json",
];

export const ACCEPT_LANGUAGES: string[] = [
	"en-US,en;q=0.9",
	"en-US,en;q=0.8",
	"en-GB,en;q=0.9,en-US;q=0.8",
	"en-US,en;q=0.9,id;q=0.8",
	"id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
	"en-US,en;q=0.9,de;q=0.7,fr;q=0.6",
	"en;q=0.9",
];

export const ACCEPT_ENCODINGS: string[] = [
	"gzip, deflate, br",
	"gzip, deflate",
	"gzip, deflate, br, zstd",
];

export const REFERERS: string[] = [
	"https://www.google.com/",
	"https://www.google.co.id/",
	"https://www.bing.com/",
	"https://www.reddit.com/",
	"https://twitter.com/",
	"https://www.facebook.com/",
	"https://t.co/",
	"https://www.instagram.com/",
];

export const SCREEN_RESOLUTIONS: string[] = [
	"1920x1080",
	"1366x768",
	"1536x864",
	"1440x900",
	"1280x720",
	"2560x1440",
	"1680x1050",
	"1280x800",
	"3840x2160",
	"2560x1600",
];

export const TIMEZONES: string[] = [
	"Asia/Jakarta",
	"Asia/Makassar",
	"Asia/Jayapura",
	"Asia/Singapore",
	"America/New_York",
	"America/Chicago",
	"America/Los_Angeles",
	"Europe/London",
	"Europe/Berlin",
	"Asia/Tokyo",
	"Australia/Sydney",
];

// Sec-Ch-Ua fingerprints matched to UA versions
export const SEC_CH_UA_FINGERPRINTS: string[] = [
	'"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
	'"Chromium";v="123", "Google Chrome";v="123", "Not-A.Brand";v="99"',
	'"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
	'"Not_A Brand";v="8", "Chromium";v="124"',
];

export const SEC_CH_UA_PLATFORMS: string[] = [
	'"Windows"',
	'"macOS"',
	'"Linux"',
	'"Android"',
	'"iOS"',
];

export function generateStealthHelpersScript(): string {
	return `
const UA_POOL = ${JSON.stringify(USER_AGENTS)};
const ACCEPT_POOL = ${JSON.stringify(ACCEPT_HEADERS)};
const LANG_POOL = ${JSON.stringify(ACCEPT_LANGUAGES)};
const ENC_POOL = ${JSON.stringify(ACCEPT_ENCODINGS)};
const REF_POOL = ${JSON.stringify(REFERERS)};
const SCREEN_POOL = ${JSON.stringify(SCREEN_RESOLUTIONS)};
const TZ_POOL = ${JSON.stringify(TIMEZONES)};
const SEC_CH_UA_POOL = ${JSON.stringify(SEC_CH_UA_FINGERPRINTS)};
const SEC_CH_PLATFORM_POOL = ${JSON.stringify(SEC_CH_UA_PLATFORMS)};

let backoffDelay = 0;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Generate random IP that looks like real residential/ISP traffic
function randomIP() {
  // Common residential IP ranges (avoid obvious datacenter ranges)
  const ranges = [
    // Class A residential
    [1, 126],
    // Class B residential
    [128, 191],
    // Class C residential
    [192, 223],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  const a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  const b = Math.floor(Math.random() * 256);
  const c = Math.floor(Math.random() * 256);
  const d = Math.floor(Math.random() * 254) + 1;
  return a + "." + b + "." + c + "." + d;
}

function generateStealthHeaders() {
  const isMobile = Math.random() < 0.3;
  const secChUaMobile = isMobile ? "?1" : "?0";

  return {
    "User-Agent": randomFrom(UA_POOL),
    "Accept": randomFrom(ACCEPT_POOL),
    "Accept-Language": randomFrom(LANG_POOL),
    "Accept-Encoding": randomFrom(ENC_POOL),
    "Referer": randomFrom(REF_POOL),
    "Cache-Control": Math.random() < 0.5 ? "no-cache" : "max-age=0",
    "Sec-Ch-Ua": randomFrom(SEC_CH_UA_POOL),
    "Sec-Ch-Ua-Mobile": secChUaMobile,
    "Sec-Ch-Ua-Platform": randomFrom(SEC_CH_PLATFORM_POOL),
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "X-Forwarded-For": randomIP(),
  };
}

// Jittered sleep — just enough variance to avoid pattern detection
function stealthSleep() {
  sleep(randomFloat(0.05, 0.5));
}

// Only backoff on actual rate limiting (429), keep pushing on other errors
function handleBackoff(res) {
  if (res && res.status === 429) {
    backoffDelay = Math.min(backoffDelay + randomFloat(0.5, 1.5), 5.0);
    sleep(backoffDelay);
    return true;
  }
  if (backoffDelay > 0) {
    backoffDelay = Math.max(backoffDelay - 0.5, 0);
  }
  return false;
}
`;
}
