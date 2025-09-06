import type { MeetingWindow } from "./types.mjs";

export const REDIRECT_BUDGET_MS = 200;
export const DEFAULT_MEETING_LENGTH_HOURS = 12;
export const WINDOW_EARLY_MINUTES = 60;

/** True if now is within [start-buffer, endCap]. */
export function isWithinMeetingWindow(
  meeting: MeetingWindow,
  now: Date = new Date(),
  startBufferSeconds: number = 3600
): boolean {
  const startMs = new Date(meeting.startUtc).getTime() - Math.max(0, startBufferSeconds) * 1000;
  const endMs = meeting.endUtc
    ? new Date(meeting.endUtc).getTime()
    : new Date(meeting.startUtc).getTime() + DEFAULT_MEETING_LENGTH_HOURS * 60 * 60 * 1000;

  const t = now.getTime();
  return t >= startMs && t <= endMs;
}
