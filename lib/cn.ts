/** Concatène des classes en ignorant les valeurs fausses. */
export function cn(
  ...classes: Array<string | false | null | undefined | 0>
): string {
  return classes.filter(Boolean).join(" ");
}
