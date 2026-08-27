/**
 * Shared hover / press affordances.
 *
 * Before this file the app had roughly a dozen hand-rolled recipes for
 * "this thing is clickable" — `hover:border-border/70` here,
 * `hover:bg-muted/30` there, `hover:-translate-y-0.5 hover:shadow-md`
 * somewhere else, and nothing at all on plenty of controls that did in
 * fact do something. The result was that hovering taught the user very
 * little: some surfaces reacted, some didn't, and the ones that did
 * reacted differently.
 *
 * These constants are plain class strings so they compose with `cn()`
 * and stay overridable — tailwind-merge resolves a caller's
 * `hover:bg-*` against the one baked in here, which a custom CSS
 * utility class could not do.
 *
 * Pick the tier by what is being hovered, not by how much emphasis you
 * want:
 *
 *   interactiveCard  a whole card/tile that navigates or opens something
 *   interactiveRow   a row in a list that sits flush against its siblings
 *   interactiveChip  a small pill/chip/tag that toggles or filters
 *   interactiveText  inline text acting as a button
 *   interactivePanel a header strip that expands/collapses in place
 *
 * Only put these on something that actually responds to a click.
 * A hover state on inert content is a promise the UI doesn't keep.
 */

/**
 * The floor every tier builds on: pointer cursor, a transition that
 * covers the properties the tiers actually animate, and a focus ring so
 * keyboard users get the same signal mouse users get.
 *
 * The transition is an explicit property list rather than
 * `transition-all` — `all` also animates layout properties, which makes
 * anything that changes size on hover visibly lag.
 */
export const pressable =
  "cursor-pointer transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * A card or tile you click to go somewhere. Lifts slightly, warms
 * towards the primary colour, and settles back down on press so the
 * click has a physical beat to it.
 *
 * The lift is `motion-safe:` — for a reduced-motion user the colour and
 * shadow still change, which is the part that carries the meaning.
 */
export const interactiveCard = `${pressable} hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-md motion-safe:hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm`;

/**
 * A row in a list. No lift: rows share edges with their neighbours, so
 * raising one shifts the whole stack and reads as a glitch. Background
 * only, deepening on press.
 */
export const interactiveRow = `${pressable} hover:bg-accent/50 active:bg-accent/70`;

/**
 * A chip, pill or tag. Small targets need a border change as well as a
 * fill — at this size a background tint alone is easy to miss.
 */
export const interactiveChip = `${pressable} hover:border-foreground/25 hover:bg-accent/50 motion-safe:active:scale-[0.97]`;

/**
 * Text that behaves like a button. Underline rather than a background,
 * so it doesn't box in a word sitting inside a sentence.
 */
export const interactiveText = `${pressable} underline-offset-2 hover:text-primary hover:underline`;

/**
 * A header strip that expands or collapses the section under it —
 * sidebar group labels, accordion headers. Kept quiet: these sit at the
 * edge of the layout and shouldn't compete with the content.
 */
export const interactivePanel = `${pressable} rounded-md hover:bg-accent/60 hover:text-foreground`;

/**
 * A hover state driven by an ancestor marked `group`, for cards whose
 * real click target is a child (a title link, an "open" button). Put
 * this on the card so the whole surface responds while the click target
 * stays honest.
 */
export const groupInteractiveCard =
  "transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out group-hover:border-primary/40 group-hover:bg-primary/[0.04] group-hover:shadow-md motion-safe:group-hover:-translate-y-0.5";
