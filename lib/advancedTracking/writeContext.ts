/**
 * Shared contract for live game writes (`apply*`). The store asserts tracker commands, validates
 * caller input, and supplies time and IDs; an `apply*` write validates only what it derives from
 * the game and throws before mutating when that is invalid.
 */
export interface WriteContext {
  /**
   * Gameplay event time (ms epoch). Feeds `recordedAt`, `startedAt`, `pausedAt`,
   * `redZone.enteredAt`, and the elapsed game time for caps; never `updatedAt`.
   */
  at: number;
  /** Creates a new ID; called only for records the write actually creates. */
  newId: () => string;
}
