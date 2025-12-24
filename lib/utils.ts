// Generate a simple unique ID for storage entities
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
