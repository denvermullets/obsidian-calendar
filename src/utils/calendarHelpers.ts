import { CalendarEvent, FormattedEvent } from "../types";

/**
 * Extracts conference/video links from event description and location
 */
export function extractConferenceLink(description: string, location: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const descriptionUrls = description.match(urlRegex) || [];
  const locationUrls = location.match(urlRegex) || [];

  // Prioritize known video conferencing platforms
  const allUrls = [...descriptionUrls, ...locationUrls];
  return (
    allUrls.find(
      (url) =>
        url.includes("zoom.us") ||
        url.includes("meet.google.com") ||
        url.includes("teams.microsoft.com") ||
        url.includes("webex.com")
    ) || ""
  );
}

/**
 * Formats event time for display
 */
export function formatEventTime(start: Date, end: Date, isAllDay: boolean): string {
  if (isAllDay) {
    return "All day";
  }

  const formatHour = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}.${displayMinutes} ${ampm}`;
  };

  return `${formatHour(start)} - ${formatHour(end).split(" ")[0]} ${formatHour(end).split(" ")[1]}`;
}

/**
 * Gets today's date with time set to midnight
 */
export function getTodayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Gets tomorrow's date with time set to midnight
 */
export function getTomorrowMidnight(): Date {
  const today = getTodayMidnight();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Checks if an event occurs today
 */
export function isEventToday(event: CalendarEvent, today: Date): boolean {
  if (event.isAllDay) {
    // For all-day events, compare just the date portion (ignore time/timezone)
    const eventDate = new Date(event.startDate);
    eventDate.setHours(0, 0, 0, 0);
    const matches = eventDate.getTime() === today.getTime();

    return matches;
  } else {
    // For timed events, use range check
    const tomorrow = getTomorrowMidnight();
    const matches = event.startDate >= today && event.startDate < tomorrow;

    return matches;
  }
}

/**
 * Checks if an event has expired (end time has passed)
 */
export function isEventExpired(event: CalendarEvent): boolean {
  const now = new Date();
  return event.endDate < now;
}

/**
 * Filters and sorts events for today
 */
export function filterAndSortTodayEvents(events: CalendarEvent[], showExpiredEvents: boolean): FormattedEvent[] {
  const today = getTodayMidnight();

  console.log("Filtering for today:", today.toISOString());
  console.log("Total events to filter:", events.length);

  const todayEvents = events.filter((event) => isEventToday(event, today));

  console.log(`Events matching today: ${todayEvents.length}`);

  // Sort with all-day events first, then by start time
  todayEvents.sort((a, b) => {
    // All-day events come first
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;
    // Otherwise sort by start time
    return a.startDate.getTime() - b.startDate.getTime();
  });

  const formattedEvents = todayEvents.map((event) => ({
    title: event.title,
    time: formatEventTime(event.startDate, event.endDate, event.isAllDay),
    location: event.location,
    hasConferenceLink: !!event.conferenceLink,
    conferenceLink: event.conferenceLink,
    attendeeCount: event.attendeeCount,
    isAllDay: event.isAllDay,
    calendarColor: event.calendarColor,
    // All-day events are never expired (they're for the whole day)
    // Timed events are expired when their end time has passed
    isExpired: event.isAllDay ? false : isEventExpired(event),
  }));

  // Filter out expired events if setting is disabled
  if (!showExpiredEvents) {
    return formattedEvents.filter((event) => !event.isExpired);
  }

  return formattedEvents;
}
