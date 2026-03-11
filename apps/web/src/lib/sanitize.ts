export function sanitizeInput(value: string): string {
  return value.replace(/[<>]/g, "").trim();
}
