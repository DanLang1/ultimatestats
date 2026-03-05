// Generate a simple unique ID for storage entities
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** True when an array exists and has at least one item. */
export function hasItems<T>(arr: T[] | null | undefined): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}
