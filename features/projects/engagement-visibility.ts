/**
 * Which engagements count as "on the project", in one place.
 *
 * The same rule is needed by the members card and by the provider's own
 * project list, and the owner app applies it too (see
 * `ProjectWorkingService.visibleTeamStatuses` in the Flutter client). It was
 * written out separately in each spot, so changing what counts as a member
 * meant finding all of them — and nothing failed if you missed one.
 *
 * `rejected` — the provider declined the invitation.
 * `terminated` — the engagement was ended by mutual consent.
 *
 * Neither is a member. `completed` is: that provider did the work, and the
 * record is worth keeping. `requested` is: the invitation is still live.
 *
 * Note this is deliberately NOT the same set as the slot rules
 * (`requested` + `accepted`). A completed engagement still shows on the team
 * but releases its slot, so a replacement can be hired.
 */
export const VISIBLE_ENGAGEMENT_STATUSES = [
  "requested",
  "accepted",
  "completed",
] as const;

export type VisibleEngagementStatus =
  (typeof VISIBLE_ENGAGEMENT_STATUSES)[number];

const VISIBLE = new Set<string>(VISIBLE_ENGAGEMENT_STATUSES);

/**
 * Whether an engagement status should appear in a team / project list.
 *
 * Unknown values return `false` rather than being let through, so a status
 * added to the backend later can't silently surface somewhere it shouldn't.
 */
export function isVisibleEngagementStatus(
  status: string,
): status is VisibleEngagementStatus {
  return VISIBLE.has(status);
}
