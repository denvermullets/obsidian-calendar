export interface CalendarConfig {
  url: string;
  color: string;
}

export interface CalendarPluginSettings {
  calendars: CalendarConfig[];
  refreshInterval: number; // in minutes
  showExpiredEvents: boolean;
}

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  description: string;
  conferenceLink: string;
  attendeeCount: number;
  isAllDay: boolean;
  calendarColor: string;
}

export interface FormattedEvent {
  title: string;
  time: string;
  location: string;
  hasConferenceLink: boolean;
  conferenceLink: string;
  attendeeCount: number;
  isAllDay: boolean;
  calendarColor: string;
  isExpired: boolean;
}
