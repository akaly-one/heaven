/**
 * timezone.ts - Belgium timezone utility for Heaven OS
 *
 * Internal clock synced to Europe/Brussels (CET/CEST).
 * Uses Intl.DateTimeFormat for timezone conversion, which handles
 * CET (UTC+1) / CEST (UTC+2) transitions automatically.
 *
 * No external dependencies.
 */

/** IANA timezone identifier for Belgium */
export const BELGIUM_TZ = "Europe/Brussels" as const;

/**
 * Returns the current date/time interpreted in Belgium timezone.
 * The returned Date object's UTC methods reflect Belgium local time.
 */
export function nowBelgium(): Date {
  const now = new Date();
  const belgiumStr = now.toLocaleString("en-US", { timeZone: BELGIUM_TZ });
  return new Date(belgiumStr);
}

/**
 * Returns the current date/time as an ISO 8601 string in Belgium timezone.
 * Format: "YYYY-MM-DDTHH:mm:ss.sss+XX:XX"
 */
export function toBelgiumISO(): string {
  const now = new Date();

  // Extract individual parts in Belgium TZ
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BELGIUM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  // Calculate Belgium UTC offset
  const belgiumTime = new Date(
    now.toLocaleString("en-US", { timeZone: BELGIUM_TZ })
  );
  const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMinutes = (belgiumTime.getTime() - utcTime.getTime()) / 60000;
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMins = String(absOffset % 60).padStart(2, "0");

  // Handle midnight edge case: hour12=false can produce "24" for midnight
  const hour = parts.hour === "24" ? "00" : parts.hour;

  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${offsetSign}${offsetHours}:${offsetMins}`;
}

/**
 * Checks if a given timestamp is expired compared to Belgium time now.
 * @param expiresAt - ISO 8601 timestamp string
 * @returns true if the timestamp is in the past (Belgium time)
 */
export function isExpired(expiresAt: string): boolean {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  return expiryDate.getTime() <= now.getTime();
}

/**
 * Returns the remaining time before expiry in a human-readable French format.
 * Examples: "2 heures et 30 minutes", "45 minutes", "Expire"
 * @param expiresAt - ISO 8601 timestamp string
 * @returns Human-readable remaining time in fr-FR locale
 */
export function expiresIn(expiresAt: string): string {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs <= 0) return "Expire";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "jour" : "jours"}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "heure" : "heures"}`);
  }
  if (minutes > 0 && days === 0) {
    // Only show minutes if less than a day remaining
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }

  if (parts.length === 0) return "Moins d'une minute";

  // Join with "et" for French formatting
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " et " + parts[parts.length - 1];
}

/**
 * Calculates an expiry date from now + duration in Belgium timezone.
 * @param durationHours - Number of hours until expiry
 * @returns ISO 8601 timestamp string of the expiry moment
 */
export function codeExpiresAt(durationHours: number): string {
  const now = new Date();
  const expiryMs = now.getTime() + durationHours * 3600000;
  const expiryDate = new Date(expiryMs);
  return expiryDate.toISOString();
}

/**
 * Checks if a client is inactive beyond the given threshold.
 * @param lastActive - ISO 8601 timestamp of last activity, or null
 * @param thresholdHours - Number of hours after which the client is considered inactive
 * @returns true if inactive beyond threshold, or if lastActive is null
 */
export function isInactive(
  lastActive: string | null,
  thresholdHours: number
): boolean {
  if (!lastActive) return true;

  const lastActiveDate = new Date(lastActive);
  const now = new Date();
  const diffMs = now.getTime() - lastActiveDate.getTime();
  const diffHours = diffMs / 3600000;

  return diffHours >= thresholdHours;
}

/**
 * Checks if an unverified account should be purged based on creation time.
 * @param createdAt - ISO 8601 timestamp of account creation
 * @param maxDays - Maximum number of days before purge
 * @returns true if the account age exceeds maxDays
 */
export function shouldPurge(createdAt: string, maxDays: number): boolean {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = diffMs / 86400000;

  return diffDays >= maxDays;
}

/**
 * Formats a date in Belgium locale (fr-BE) with timezone Europe/Brussels.
 * @param date - ISO 8601 string or Date object
 * @param format - Output format:
 *   - "short"  -> "7 avr. 2026"
 *   - "full"   -> "lundi 7 avril 2026 a 14:30"
 *   - "time"   -> "14:30"
 *   Defaults to "short".
 * @returns Formatted date string in fr-FR locale, Belgium timezone
 */
export function formatBelgium(
  date: string | Date,
  format: "short" | "full" | "time" = "short"
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = { timeZone: BELGIUM_TZ };

  switch (format) {
    case "short":
      return d.toLocaleDateString("fr-FR", {
        ...options,
        day: "numeric",
        month: "short",
        year: "numeric",
      });

    case "full":
      return d.toLocaleString("fr-FR", {
        ...options,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    case "time":
      return d.toLocaleTimeString("fr-FR", {
        ...options,
        hour: "2-digit",
        minute: "2-digit",
      });
  }
}
