export function sanitizeForScript(value: string): string {
  return JSON.stringify(value);
}