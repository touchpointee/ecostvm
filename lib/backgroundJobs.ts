import { startBirthdayScheduler } from "./birthdays";
import { startRetryScheduler } from "./retryScheduler";

let started = false;

export function startBackgroundJobs() {
  if (started) return;
  started = true;
  startRetryScheduler();
  startBirthdayScheduler();
}
