export interface CalendarPluginSettings {
  icsUrl: string;
  refreshInterval: number; // in minutes
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
}

export interface FormattedEvent {
  title: string;
  time: string;
  location: string;
  hasConferenceLink: boolean;
  conferenceLink: string;
  attendeeCount: number;
  isAllDay: boolean;
}
