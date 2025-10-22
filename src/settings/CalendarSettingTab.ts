import { App, PluginSettingTab, Setting } from "obsidian";
import type CalendarPlugin from "../main";
import { renderCalendarUrlList } from "./settingsHelpers";

export class CalendarSettingTab extends PluginSettingTab {
  plugin: CalendarPlugin;

  constructor(app: App, plugin: CalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Calendar Settings" });

    // Render calendar URL list
    renderCalendarUrlList(containerEl, this.plugin, () => this.display());

    // Refresh interval setting
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

    // Show expired events setting
    new Setting(containerEl)
      .setName("Show Expired Events")
      .setDesc("Keep expired events visible in a muted style")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showExpiredEvents)
          .onChange(async (value) => {
            this.plugin.settings.showExpiredEvents = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
