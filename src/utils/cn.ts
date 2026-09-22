export function cn(...classes: (string | number | boolean | undefined | null | bigint | false)[]): string {
  return classes.filter(Boolean).join(' ').trim();
}
