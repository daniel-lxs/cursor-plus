/**
 * Formats a time string in HH:mm:ss format
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Calculates the next reset date while preserving the day of the month
 */
export function getNextResetDate(startOfMonth: string): string {
  const date = new Date(startOfMonth);
  const currentDay = date.getDate();
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();

  // Create next month's date with the same day
  const nextReset = new Date(currentYear, currentMonth + 1, currentDay);

  // Handle edge cases (e.g., Jan 31 -> Feb 28/29)
  if (nextReset.getMonth() !== (currentMonth + 1) % 12) {
    // If we got bumped to the next month, go back to the last day of target month
    nextReset.setDate(0);
  }

  return nextReset.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}
