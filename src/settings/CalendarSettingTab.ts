import { App, PluginSettingTab, Setting } from "obsidian";
import type CalendarPlugin from "../main";

export class CalendarSettingTab extends PluginSettingTab {
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
