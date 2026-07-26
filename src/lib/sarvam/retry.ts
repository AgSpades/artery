export function shouldRetrySarvam(
  status: number | undefined,
  attempt: number,
) {
  return attempt === 0 && (status === undefined || status >= 500);
}
