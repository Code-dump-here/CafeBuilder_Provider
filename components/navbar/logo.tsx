/**
 * Brand wordmark.
 *
 * Replaces the "logoipsum" placeholder SVG that shipped with the template —
 * its paths literally drew the word "logoipsum" next to a stock circular mark.
 *
 * Text rather than an image: the brand is a word, so rendering it as type keeps
 * it crisp at any size, recolours correctly in light and dark via
 * `text-foreground`, and stays readable to screen readers and search engines
 * without needing alt text.
 */
export const Logo = () => (
  <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
    CafeBuilder
  </span>
);
