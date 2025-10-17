import { App, ItemView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, requestUrl } from 'obsidian';
import ICAL from 'ical.js';

interface CalendarPluginSettings {
	icsUrl: string;
	refreshInterval: number; // in minutes
}

const DEFAULT_SETTINGS: CalendarPluginSettings = {
	icsUrl: '',
	refreshInterval: 30
}

const VIEW_TYPE_CALENDAR = 'calendar-view';

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
		return 'Calendar';
	}

	getIcon(): string {
		return 'calendar';
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
		container.addClass('calendar-view-container');

		if (!this.plugin.settings.icsUrl) {
			container.createEl('div', {
				text: 'No ICS URL configured. Please set it in plugin settings.',
				cls: 'calendar-empty-state'
			});
			return;
		}

		try {
			const events = await this.fetchAndParseCalendar();
			const todayEvents = this.filterTodayEvents(events);

			if (todayEvents.length === 0) {
				container.createEl('div', {
					text: 'No events scheduled for today',
					cls: 'calendar-empty-state'
				});
			} else {
				const header = container.createEl('h4', { text: "Today's Schedule" });
				header.addClass('calendar-header');

				const eventList = container.createEl('div', { cls: 'calendar-event-list' });

				todayEvents.forEach(event => {
					const eventEl = eventList.createEl('div', { cls: 'calendar-event-item' });

					const timeEl = eventEl.createEl('div', {
						text: event.time,
						cls: 'calendar-event-time'
					});

					const titleEl = eventEl.createEl('div', {
						text: event.title,
						cls: 'calendar-event-title'
					});

					if (event.location) {
						const locationEl = eventEl.createEl('div', {
							text: `=Í ${event.location}`,
							cls: 'calendar-event-location'
						});
					}
				});
			}
		} catch (error) {
			container.createEl('div', {
				text: `Error loading calendar: ${error.message}`,
				cls: 'calendar-error'
			});
			console.error('Calendar fetch error:', error);
		}
	}

	private async fetchAndParseCalendar(): Promise<CalendarEvent[]> {
		const response = await requestUrl({
			url: this.plugin.settings.icsUrl,
			method: 'GET'
		});

		const jcalData = ICAL.parse(response.text);
		const comp = new ICAL.Component(jcalData);
		const vevents = comp.getAllSubcomponents('vevent');

		const events: CalendarEvent[] = vevents.map(vevent => {
			const event = new ICAL.Event(vevent);

			return {
				title: event.summary || 'Untitled Event',
				startDate: event.startDate.toJSDate(),
				endDate: event.endDate.toJSDate(),
				location: event.location || '',
				description: event.description || ''
			};
		});

		return events;
	}

	private filterTodayEvents(events: CalendarEvent[]): FormattedEvent[] {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const todayEvents = events.filter(event => {
			const eventDate = new Date(event.startDate);
			return eventDate >= today && eventDate < tomorrow;
		});

		// Sort by start time
		todayEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

		return todayEvents.map(event => ({
			title: event.title,
			time: this.formatTime(event.startDate, event.endDate),
			location: event.location
		}));
	}

	private formatTime(start: Date, end: Date): string {
		const formatHour = (date: Date) => {
			const hours = date.getHours();
			const minutes = date.getMinutes();
			const ampm = hours >= 12 ? 'PM' : 'AM';
			const displayHours = hours % 12 || 12;
			const displayMinutes = minutes.toString().padStart(2, '0');
			return `${displayHours}:${displayMinutes} ${ampm}`;
		};

		return `${formatHour(start)} - ${formatHour(end)}`;
	}
}

interface CalendarEvent {
	title: string;
	startDate: Date;
	endDate: Date;
	location: string;
	description: string;
}

interface FormattedEvent {
	title: string;
	time: string;
	location: string;
}

export default class CalendarPlugin extends Plugin {
	settings: CalendarPluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_CALENDAR,
			(leaf) => new CalendarView(leaf, this)
		);

		this.addRibbonIcon('calendar', 'Open Calendar', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-calendar-view',
			name: 'Open Calendar View',
			callback: () => {
				this.activateView();
			}
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
		leaves.forEach(leaf => {
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
			.setName('ICS Calendar URL')
			.setDesc('Enter the ICS URL from your calendar (e.g., Google Calendar ICS link)')
			.addText(text => text
				.setPlaceholder('https://calendar.google.com/...')
				.setValue(this.plugin.settings.icsUrl)
				.onChange(async (value) => {
					this.plugin.settings.icsUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Refresh Interval')
			.setDesc('How often to refresh the calendar (in minutes)')
			.addText(text => text
				.setPlaceholder('30')
				.setValue(String(this.plugin.settings.refreshInterval))
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.refreshInterval = num;
						await this.plugin.saveSettings();
					}
				}));
	}
}
