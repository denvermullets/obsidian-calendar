import { ButtonComponent, Setting } from "obsidian";
import { arrayMove } from "../utils/arrayHelpers";
import type CalendarPlugin from "../main";

/**
 * Renders the calendar URL list with add/remove/reorder controls
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
          plugin.settings.icsUrls.push("");
          await plugin.saveSettings();
          onUpdate();
        });
    });

  // Render each calendar URL with controls
  plugin.settings.icsUrls.forEach((url, index) => {
    const s = new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder("https://calendar.google.com/...")
          .setValue(url)
          .onChange(async (newUrl) => {
            plugin.settings.icsUrls[index] = newUrl;
            await plugin.saveSettings();
          });
        text.inputEl.style.width = "100%";
      })
      .addExtraButton((cb) => {
        cb.setIcon("up-chevron-glyph")
          .setTooltip("Move up")
          .onClick(async () => {
            arrayMove(plugin.settings.icsUrls, index, index - 1);
            await plugin.saveSettings();
            onUpdate();
          });
      })
      .addExtraButton((cb) => {
        cb.setIcon("down-chevron-glyph")
          .setTooltip("Move down")
          .onClick(async () => {
            arrayMove(plugin.settings.icsUrls, index, index + 1);
            await plugin.saveSettings();
            onUpdate();
          });
      })
      .addExtraButton((cb) => {
        cb.setIcon("cross")
          .setTooltip("Delete")
          .onClick(async () => {
            plugin.settings.icsUrls.splice(index, 1);
            await plugin.saveSettings();
            onUpdate();
          });
      });
    s.infoEl.remove();
  });
}
