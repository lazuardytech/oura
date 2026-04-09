export const USER_AGENTS: string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edg/120.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
];

export const ACCEPT_HEADERS: string[] = [
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
];

export const ACCEPT_LANGUAGES: string[] = [
  "en-US,en;q=0.9",
  "en-US,en;q=0.8",
  "en-GB,en;q=0.9,en-US;q=0.8",
  "en-US,en;q=0.9,de;q=0.7,fr;q=0.6",
  "en;q=0.9",
];

export const ACCEPT_ENCODINGS: string[] = [
  "gzip, deflate, br",
  "gzip, deflate",
  "gzip, deflate, br;q=1.0, *;q=0.5",
];

export const REFERERS: string[] = [
  "https://www.google.com/",
  "https://www.bing.com/",
  "https://www.reddit.com/",
  "https://news.ycombinator.com/",
  "https://twitter.com/",
  "https://github.com/",
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
];

export const TIMEZONES: string[] = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
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

let backoffDelay = 0;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function generateStealthHeaders() {
  return {
    "User-Agent": randomFrom(UA_POOL),
    "Accept": randomFrom(ACCEPT_POOL),
    "Accept-Language": randomFrom(LANG_POOL),
    "Accept-Encoding": randomFrom(ENC_POOL),
    "Referer": randomFrom(REF_POOL),
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "X-Resolution": randomFrom(SCREEN_POOL),
    "X-Timezone": randomFrom(TZ_POOL),
  };
}

function stealthSleep() {
  sleep(randomFloat(0.5, 3.0));
}

function handleBackoff(res) {
  if (res.status === 429) {
    backoffDelay = Math.min(backoffDelay * 2 + randomFloat(0.5, 1.0), 30.0);
    sleep(backoffDelay);
    return true;
  }
  backoffDelay = 0;
  return false;
}
`;
}