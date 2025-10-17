import { ItemView, WorkspaceLeaf, requestUrl } from "obsidian";
import ICAL from "ical.js";
import { CalendarEvent, FormattedEvent } from "../types";
import { VIEW_TYPE_CALENDAR } from "../constants";
import type CalendarPlugin from "../main";

export class CalendarView extends ItemView {
  plugin: CalendarPlugin;
  private refreshIntervalId: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: CalendarPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Calendar";
  }

  getIcon(): string {
    return "calendar";
  }

  async onOpen() {
    await this.renderCalendar();
    this.startAutoRefresh();
  }

  async onClose() {
    this.stopAutoRefresh();
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();

    const intervalMs = this.plugin.settings.refreshInterval * 60 * 1000;
    this.refreshIntervalId = window.setInterval(() => {
      this.renderCalendar();
    }, intervalMs);
  }

  private stopAutoRefresh() {
    if (this.refreshIntervalId !== null) {
      window.clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  async renderCalendar() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("calendar-view-container");

    if (!this.plugin.settings.icsUrl) {
      container.createEl("div", {
        text: "No ICS URL configured. Please set it in plugin settings.",
        cls: "calendar-empty-state",
      });
      return;
    }

    try {
      const events = await this.fetchAndParseCalendar();
      const todayEvents = this.filterTodayEvents(events);

      if (todayEvents.length === 0) {
        container.createEl("div", {
          text: "No events scheduled for today",
          cls: "calendar-empty-state",
        });
      } else {
        const header = container.createEl("h4", { text: "Today's Schedule" });
        header.addClass("calendar-header");

        const eventList = container.createEl("div", { cls: "calendar-event-list" });

        todayEvents.forEach((event) => {
          const eventEl = eventList.createEl("div", { cls: "calendar-event-item" });

          // Content column: time, title, guests, and join button
          const contentColumn = eventEl.createEl("div", { cls: "calendar-event-top-row" });

          // Time
          contentColumn.createEl("div", { text: event.time, cls: "calendar-event-time" });

          // Title
          contentColumn.createEl("div", {
            text: event.title,
            cls: "calendar-event-title",
          });

          // Guest count
          if (event.attendeeCount > 0) {
            const guestContainer = contentColumn.createEl("div", { cls: "calendar-event-guests" });
            // guestContainer.createEl("span", { text: "👤", cls: "calendar-event-icon" });
            guestContainer.createEl("span", {
              text: `${event.attendeeCount} guest${event.attendeeCount !== 1 ? "s" : ""}`,
            });
          }

          // Join meeting button
          if (event.hasConferenceLink) {
            const joinBtn = contentColumn.createEl("div", {
              text: "Join Meeting",
              cls: "calendar-join-button",
            });
            if (event.conferenceLink) {
              joinBtn.addEventListener("click", () => {
                window.open(event.conferenceLink, "_blank");
              });
            }
          }
        });
      }
    } catch (error) {
      container.createEl("div", {
        text: `Error loading calendar: ${error.message}`,
        cls: "calendar-error",
      });
      console.error("Calendar fetch error:", error);
    }
  }

  private async fetchAndParseCalendar(): Promise<CalendarEvent[]> {
    const response = await requestUrl({
      url: this.plugin.settings.icsUrl,
      method: "GET",
    });

    const jcalData = ICAL.parse(response.text);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");

    // Set up date range for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events: CalendarEvent[] = [];

    vevents.forEach((vevent) => {
      const event = new ICAL.Event(vevent);

      // Extract conference/video link from description or location
      let conferenceLink = "";
      const description = event.description || "";
      const location = event.location || "";

      // Look for common video conferencing URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const descriptionUrls = description.match(urlRegex) || [];
      const locationUrls = location.match(urlRegex) || [];

      // Prioritize known video conferencing platforms
      const allUrls = [...descriptionUrls, ...locationUrls];
      conferenceLink =
        allUrls.find(
          (url) =>
            url.includes("zoom.us") ||
            url.includes("meet.google.com") ||
            url.includes("teams.microsoft.com") ||
            url.includes("webex.com")
        ) || "";

      // Get attendee count
      const attendees = vevent.getAllProperties("attendee");

      // Detect if this is an all-day event
      const isAllDay = event.startDate.isDate || false;

      // Check if this is a recurring event
      if (event.isRecurring()) {
        console.log(`Recurring event found: ${event.summary}`);

        // Expand recurring events for today only
        const iter = event.iterator();
        let next;

        // Iterate through occurrences (with a safety limit)
        let count = 0;
        const maxIterations = 1000; // Safety limit

        while ((next = iter.next()) && count < maxIterations) {
          count++;
          const occurrenceDate = next.toJSDate();

          // Check if this occurrence is today
          const occurrenceDay = new Date(occurrenceDate);
          occurrenceDay.setHours(0, 0, 0, 0);

          if (occurrenceDay.getTime() === today.getTime()) {
            // This occurrence is today, add it
            const endDate = event.endDate ? event.endDate.toJSDate() : occurrenceDate;

            events.push({
              title: event.summary || "Untitled Event",
              startDate: occurrenceDate,
              endDate: endDate,
              location: location,
              description: description,
              conferenceLink: conferenceLink,
              attendeeCount: attendees.length,
              isAllDay: isAllDay,
            });

            console.log(`Found today's occurrence of recurring event: ${event.summary}`);
            break; // Found today's occurrence, stop iterating
          }

          // If we've passed today, stop looking
          if (occurrenceDay > today) {
            break;
          }
        }
      } else {
        // Non-recurring event - add as-is
        events.push({
          title: event.summary || "Untitled Event",
          startDate: event.startDate.toJSDate(),
          endDate: event.endDate.toJSDate(),
          location: location,
          description: description,
          conferenceLink: conferenceLink,
          attendeeCount: attendees.length,
          isAllDay: isAllDay,
        });
      }
    });

    console.log(`Total events parsed: ${events.length}`);
    return events;
  }

  private filterTodayEvents(events: CalendarEvent[]): FormattedEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("Filtering for today:", today.toISOString());
    console.log("Total events to filter:", events.length);

    const todayEvents = events.filter((event) => {
      if (event.isAllDay) {
        // For all-day events, compare just the date portion (ignore time/timezone)
        const eventDate = new Date(event.startDate);
        eventDate.setHours(0, 0, 0, 0);
        const matches = eventDate.getTime() === today.getTime();
        console.log(`All-day event "${event.title}":`, {
          eventDate: eventDate.toISOString(),
          today: today.toISOString(),
          matches,
        });
        return matches;
      } else {
        // For timed events, use the existing range check
        const matches = event.startDate >= today && event.startDate < tomorrow;
        console.log(`Timed event "${event.title}":`, {
          startDate: event.startDate.toISOString(),
          matches,
        });
        return matches;
      }
    });

    console.log(`Events matching today: ${todayEvents.length}`);

    // Sort with all-day events first, then by start time
    todayEvents.sort((a, b) => {
      // All-day events come first
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      // Otherwise sort by start time
      return a.startDate.getTime() - b.startDate.getTime();
    });

    return todayEvents.map((event) => ({
      title: event.title,
      time: this.formatTime(event.startDate, event.endDate, event.isAllDay),
      location: event.location,
      hasConferenceLink: !!event.conferenceLink,
      conferenceLink: event.conferenceLink,
      attendeeCount: event.attendeeCount,
      isAllDay: event.isAllDay,
    }));
  }

  private formatTime(start: Date, end: Date, isAllDay: boolean): string {
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

    return `${formatHour(start)} - ${formatHour(end).split(" ")[0]} ${
      formatHour(end).split(" ")[1]
    }`;
  }
}
