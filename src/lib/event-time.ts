export const EVENT_TIME_ZONE = "Australia/Sydney";

const dateTimeLocalPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function getTimeZoneParts(value: Date, timeZone = EVENT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;
}

function getTimeZoneOffsetMs(value: Date, timeZone = EVENT_TIME_ZONE) {
  const parts = getTimeZoneParts(value, timeZone);
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return localAsUtc - value.getTime();
}

export function formatSydneyDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = getTimeZoneParts(date);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function sydneyDateTimeLocalToIso(value: string) {
  const match = dateTimeLocalPattern.exec(value);

  if (!match) {
    throw new Error("Use a Sydney local date/time.");
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  let instant = new Date(
    localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc)),
  );
  instant = new Date(localAsUtc - getTimeZoneOffsetMs(instant));

  const resolved = getTimeZoneParts(instant);
  const isValidWallTime =
    resolved.year === year &&
    resolved.month === month &&
    resolved.day === day &&
    resolved.hour === hour &&
    resolved.minute === minute &&
    resolved.second === second;

  if (!isValidWallTime) {
    throw new Error("That Sydney local time does not exist.");
  }

  return instant.toISOString();
}
