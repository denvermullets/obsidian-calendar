import {
  App,
  ItemView,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
  requestUrl,
} from "obsidian";
import ICAL from "ical.js";

interface CalendarPluginSettings {
  icsUrl: string;
  refreshInterval: number; // in minutes
}

const DEFAULT_SETTINGS: CalendarPluginSettings = {
  icsUrl: "",
  refreshInterval: 30,
};

const VIEW_TYPE_CALENDAR = "calendar-view";

class CalendarView extends ItemView {
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

    const events: CalendarEvent[] = vevents.map((vevent) => {
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

      return {
        title: event.summary || "Untitled Event",
        startDate: event.startDate.toJSDate(),
        endDate: event.endDate.toJSDate(),
        location: location,
        description: description,
        conferenceLink: conferenceLink,
        attendeeCount: attendees.length,
      };
    });

    return events;
  }

  private filterTodayEvents(events: CalendarEvent[]): FormattedEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return eventDate >= today && eventDate < tomorrow;
    });

    // Sort by start time
    todayEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return todayEvents.map((event) => ({
      title: event.title,
      time: this.formatTime(event.startDate, event.endDate),
      location: event.location,
      hasConferenceLink: !!event.conferenceLink,
      conferenceLink: event.conferenceLink,
      attendeeCount: event.attendeeCount,
    }));
  }

  private formatTime(start: Date, end: Date): string {
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

interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  description: string;
  conferenceLink: string;
  attendeeCount: number;
}

interface FormattedEvent {
  title: string;
  time: string;
  location: string;
  hasConferenceLink: boolean;
  conferenceLink: string;
  attendeeCount: number;
}

export default class CalendarPlugin extends Plugin {
  settings: CalendarPluginSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => new CalendarView(leaf, this));

    this.addRibbonIcon("calendar", "Open Calendar", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-calendar-view",
      name: "Open Calendar View",
      callback: () => {
        this.activateView();
      },
    });

    this.addSettingTab(new CalendarSettingTab(this.app, this));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Refresh the view if it's open
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
    leaves.forEach((leaf) => {
      if (leaf.view instanceof CalendarView) {
        leaf.view.renderCalendar();
      }
    });
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}

class CalendarSettingTab extends PluginSettingTab {
  plugin: CalendarPlugin;

  constructor(app: App, plugin: CalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("ICS Calendar URL")
      .setDesc("Enter the ICS URL from your calendar (e.g., Google Calendar ICS link)")
      .addText((text) =>
        text
          .setPlaceholder("https://calendar.google.com/...")
          .setValue(this.plugin.settings.icsUrl)
          .onChange(async (value) => {
            this.plugin.settings.icsUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Refresh Interval")
      .setDesc("How often to refresh the calendar (in minutes)")
      .addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.refreshInterval))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.refreshInterval = num;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
