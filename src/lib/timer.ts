// Countdown from an end time, so the timer stays right when the phone pauses the app.

// Whole seconds left until `endsAt`, never below zero. 0.2 s left still shows as 1 s.
export function remainingSeconds(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export const TIMER_STEP_SECONDS = 15;

// The timer length after a step up or down, between one step and one hour.
export function stepDuration(seconds: number, direction: 1 | -1): number {
  return Math.min(3600, Math.max(TIMER_STEP_SECONDS, seconds + direction * TIMER_STEP_SECONDS));
}
