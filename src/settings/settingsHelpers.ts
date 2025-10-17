import { ButtonComponent, Setting } from "obsidian";
import { arrayMove } from "../utils/arrayHelpers";
import { DEFAULT_CALENDAR_COLORS } from "../constants";
import type CalendarPlugin from "../main";

/**
 * Renders the calendar URL list with add/remove/reorder controls and color pickers
 */
export function renderCalendarUrlList(
  containerEl: HTMLElement,
  plugin: CalendarPlugin,
  onUpdate: () => void
): void {
  // Add header and "Add" button
  new Setting(containerEl)
    .setName("ICS Calendar URLs")
    .setDesc("Add one or more ICS calendar URLs (e.g., Google Calendar ICS links)")
    .addButton((button: ButtonComponent) => {
      button
        .setTooltip("Add calendar URL")
        .setButtonText("+")
        .setCta()
        .onClick(async () => {
          // Assign next color from default palette
          const nextColor =
            DEFAULT_CALENDAR_COLORS[plugin.settings.calendars.length % DEFAULT_CALENDAR_COLORS.length];
          plugin.settings.calendars.push({ url: "", color: nextColor });
          await plugin.saveSettings();
          onUpdate();
        });
    });

  // Render each calendar with URL input, color picker, and controls
  plugin.settings.calendars.forEach((calendar, index) => {
    const s = new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder("https://calendar.google.com/...")
          .setValue(calendar.url)
          .onChange(async (newUrl) => {
            plugin.settings.calendars[index].url = newUrl;
            await plugin.saveSettings();
          });
        text.inputEl.style.width = "100%";
      })
      .addColorPicker((color) => {
        color.setValue(calendar.color).onChange(async (newColor) => {
          plugin.settings.calendars[index].color = newColor;
          await plugin.saveSettings();
          // Update the color indicator
          const colorIndicator = s.controlEl.querySelector(".calendar-color-indicator") as HTMLElement;
          if (colorIndicator) {
            colorIndicator.style.backgroundColor = newColor;
          }
        });
      })
      .addExtraButton((cb) => {
        cb.setIcon("up-chevron-glyph")
          .setTooltip("Move up")
          .onClick(async () => {
            arrayMove(plugin.settings.calendars, index, index - 1);
            await plugin.saveSettings();
            onUpdate();
          });
      })
      .addExtraButton((cb) => {
        cb.setIcon("down-chevron-glyph")
          .setTooltip("Move down")
          .onClick(async () => {
            arrayMove(plugin.settings.calendars, index, index + 1);
            await plugin.saveSettings();
            onUpdate();
          });
      })
      .addExtraButton((cb) => {
        cb.setIcon("cross")
          .setTooltip("Delete")
          .onClick(async () => {
            plugin.settings.calendars.splice(index, 1);
            await plugin.saveSettings();
            onUpdate();
          });
      });
    s.infoEl.remove();
  });
}
