import { ItemView, WorkspaceLeaf, requestUrl } from "obsidian";
import ICAL from "ical.js";
import { CalendarEvent } from "../types";
import { VIEW_TYPE_CALENDAR } from "../constants";
import type CalendarPlugin from "../main";
import {
  extractConferenceLink,
  filterAndSortTodayEvents,
  getTodayMidnight,
} from "../utils/calendarHelpers";

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

    // Check for empty calendars before fetching
    if (this.plugin.settings.calendars.length === 0) {
      container.empty();
      container.addClass("calendar-view-container");
      container.createEl("div", {
        text: "No calendar URLs configured. Please add calendars in plugin settings.",
        cls: "calendar-empty-state",
      });
      return;
    }

    try {
      // Fetch data first, before clearing the container
      const events = await this.fetchAndParseCalendar();
      const todayEvents = filterAndSortTodayEvents(events, this.plugin.settings.showExpiredEvents);

      // Now clear and re-render with the new data
      container.empty();
      container.addClass("calendar-view-container");

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

          // Add expired class if event has ended
          if (event.isExpired) {
            eventEl.addClass("calendar-event-expired");
          }

          // Set custom property for the vertical bar color
          eventEl.style.setProperty("--event-color", event.calendarColor);

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
            // Only make the button clickable if the event hasn't expired
            if (event.conferenceLink && !event.isExpired) {
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
    // Set up date range for today
    const today = getTodayMidnight();

    const allEvents: CalendarEvent[] = [];

    // Fetch and parse events from each calendar URL
    for (const calendar of this.plugin.settings.calendars) {
      if (!calendar.url.trim()) {
        continue; // Skip empty URLs
      }

      try {
        const response = await requestUrl({
          url: calendar.url,
          method: "GET",
        });

        const jcalData = ICAL.parse(response.text);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents("vevent");

        this.parseEvents(vevents, today, calendar.color, allEvents);
      } catch (error) {
        console.error(`Failed to fetch calendar from ${calendar.url}:`, error);
        // Continue with other calendars even if one fails
      }
    }

    console.log(`Total events parsed: ${allEvents.length}`);
    return allEvents;
  }

  private parseEvents(
    vevents: any[],
    today: Date,
    calendarColor: string,
    events: CalendarEvent[]
  ): void {

    vevents.forEach((vevent) => {
      const event = new ICAL.Event(vevent);

      // Extract conference/video link from description or location
      const description = event.description || "";
      const location = event.location || "";
      const conferenceLink = extractConferenceLink(description, location);

      // Get attendee count
      const attendees = vevent.getAllProperties("attendee");
      const isAllDay = event.startDate.isDate || false;

      if (event.isRecurring()) {
        // Calculate duration from the original event
        const duration = event.duration;

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
            // Calculate end date for this occurrence using the duration
            const endDate = new Date(occurrenceDate);
            if (duration) {
              endDate.setSeconds(endDate.getSeconds() + duration.toSeconds());
            }

            events.push({
              title: event.summary || "Untitled Event",
              startDate: occurrenceDate,
              endDate: endDate,
              location: location,
              description: description,
              conferenceLink: conferenceLink,
              attendeeCount: attendees.length,
              isAllDay: isAllDay,
              calendarColor: calendarColor,
            });
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
          calendarColor: calendarColor,
        });
      }
    });
  }
}
