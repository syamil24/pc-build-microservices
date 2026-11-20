export function productTransitionName(id: string) {
  return `part-${id.replace(/[^A-Za-z0-9_-]/g, "")}`;
}
