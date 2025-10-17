import { Plugin, WorkspaceLeaf } from "obsidian";
import { CalendarPluginSettings } from "./types";
import { DEFAULT_SETTINGS, VIEW_TYPE_CALENDAR } from "./constants";
import { CalendarView } from "./views/CalendarView";
import { CalendarSettingTab } from "./settings/CalendarSettingTab";

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
