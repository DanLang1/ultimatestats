# U-Stat Ultimate Domain

This glossary defines the Ultimate-specific language used in U-Stat’s player-facing copy and
domain documentation.

## Language

**Ultimate**:
The sport tracked by U-Stat.
Use **Ultimate Frisbee** in first-introduction and other important formal copy; use **Ultimate** as
the usual shorthand.

**Team**:
A reusable roster or organization that can play in many games.
_Avoid_: Side, when referring to the saved roster or organization.

**Side**:
One of the two competing groups in a specific advanced-tracking game. In a scrimmage, a player may
represent a different side from one point to another.
_Avoid_: Team, when the distinction matters for a specific game.

**Basic tracking**:
One-team tracking of the user's team against an opponent. It does not use the advanced-tracking
side model or track an opponent roster.

**Player**:
The person whose play and statistics U-Stat tracks.
_Avoid_: Participant, in player-facing copy.

**Participant**:
The game-scoped record of a player used by advanced tracking. A participant can represent different
sides across points in a scrimmage.
_Avoid_: Player, in advanced-tracking model and persistence documentation where the distinction
matters.

**Goal**:
A scoring play, including a Callahan.
_Avoid_: Score, when referring to the play rather than the cumulative result.

**Point**:
The unit of play that starts with a pull and normally ends with a goal.
_Avoid_: Goal, when referring to the whole unit of play.

**Score**:
The cumulative numeric result of a game.
_Avoid_: Goal, when referring to the game total.

**Starting line**:
The players on a side when a point begins with its pull.
_Avoid_: Active line, when in-point substitutions have occurred.

**Active line**:
The players currently on a side after applying in-point substitutions.
_Avoid_: Starting line, when substitutions have changed who is on the field.

**Next line**:
The players selected for a side before the next point begins. It is not part of that point until the
pull is recorded.

**Offensive point (O-point)**:
A point in which a side receives the opening pull.
_Avoid_: A permanent player role or a particular lineup.

**Defensive point (D-point)**:
A point in which a side throws the opening pull.
_Avoid_: A permanent player role or a particular lineup.

**Possession**:
The side that currently controls the disc.
_Avoid_: Possession record, unless discussing the stored advanced-tracking action segment.

**Possession record**:
The advanced-tracking record that groups a side's consecutive actions while it has the disc.

**Callahan**:
A defensive turnover score: the offense throws a pass that the defense intercepts in the end zone it
is defending, immediately scoring a goal for the defense.
_Avoid_: A goal on a defensive throw.

**Roller pull**:
A pull intended to roll along the ground.

**Out-of-bounds pull (OB pull)**:
A pull that lands out of bounds.

**Basic turnover attribution team**:
The team whose player or action receives the recorded turnover attribution. A block credits the
defending team; a drop, throwaway, or 50–50 credits the team that lost possession.
_Avoid_: Team that committed the turnover, for all turnover types.

**Throw**:
A player's disc attempt. A throw may be completed, result in a turnover, or score a goal.

**Pass**:
A completed throw, including a scoring throw.
_Avoid_: Throw, when naming a stat that counts completed throws.

**Block**:
A defensive play that stops or intercepts an offensive throw and causes a turnover.
_Avoid_: D, except as compact familiar shorthand in space-constrained UI.

**Disc**:
The object used to play Ultimate.
_Avoid_: Frisbee, except where an external name or fixed product title requires it.

**Game**:
A contest of Ultimate between teams or sides.
_Avoid_: Match, except in fixed external wording.

**Offense**:
The side currently possessing the disc.

**Defense**:
The side not currently possessing the disc.

**Turnover**:
The outcome that changes possession.
_Avoid_: Turn, except as casual shorthand.

**Pickup**:
The action that establishes possession after a turnover or dead disc.
_Avoid_: Disc pickup, except in advanced-tracking model terminology.

**Inbound pull**:
A pull that lands in the field of play.

**Pressure**:
Defensive pressure that directly forces a turnover without a block or stall.

**50–50**:
A turnover by the tracked team for which both the thrower and intended receiver are partially at
fault.
_Avoid_: Any merely difficult throw.

**Hold**:
A point won by the receiving side on its offensive point.

**Break**:
A point won by the pulling side on its defensive point.

**Goal scorer**:
The player who catches the completed scoring throw. A Callahan scorer receives the goal, Callahan,
and block credits.

**Assister**:
The player who throws the completed scoring throw.
_Avoid_: Assister, for a Callahan.

**Opponent**:
The team playing against the tracked team in Basic or single-team Advanced tracking.
_Avoid_: Opponent, for the other side of a scrimmage.

**Stoppage**:
An interruption within a point, such as a timeout, injury, or manual pause. A stoppage does not
itself end possession or the point.
