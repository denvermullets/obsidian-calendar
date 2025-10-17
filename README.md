# Obsidian Calendar Plugin

An Obsidian plugin that displays today's events from multiple ICS calendar feeds in your sidebar. Perfect for keeping your schedule visible while working in your notes.

<img width="385" height="614" alt="image" src="https://github.com/user-attachments/assets/b56aabe6-1424-4aa0-bb7e-7e2718e969da" />

## Features

- **Multiple Calendar Support** - Add and manage multiple ICS calendar URLs
- **Custom Calendar Colors** - Assign unique colors to each calendar for easy visual distinction
- **All-Day Event Support** - Properly displays all-day events at the top of your schedule
- **Recurring Event Support** - Handles recurring events and shows today's occurrences
- **Conference Link Detection** - Automatically detects and displays join buttons for Zoom, Google Meet, Teams, and Webex meetings
- **Attendee Count** - Shows the number of guests for each event
- **Auto-Refresh** - Configurable automatic refresh interval to keep your schedule up-to-date
- **Clean Modern UI** - Card-based design with colored accent bars matching your calendars

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Settings -> Community Plugins
2. Search for "Calendar"
3. Click Install
4. Enable the plugin

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/yourusername/obsidian-calendar/releases)
2. Extract the files into your vault's `.obsidian/plugins/obsidian-calendar/` folder
3. Reload Obsidian
4. Enable the plugin in Settings -> Community Plugins

## Setup

### Getting Your Calendar ICS URL

#### Google Calendar

> **Important:** You probably want to use the **private "Secret address in iCal format"** URL, not the public calendar URL. The public URL will not work unless your calendar is public.

1. Open [Google Calendar](https://calendar.google.com)
2. Click the three dots next to the calendar you want to add
3. Select "Settings and sharing"
4. Scroll down to "Integrate calendar"
5. Copy the **"Secret address in iCal format"** URL (not the public calendar address)

#### Other Calendar Providers

Most calendar applications provide an ICS export URL. Look for:

- "Calendar sharing"
- "Export" or "Subscribe"
- "iCal feed" or "ICS URL"

### Adding Calendars to the Plugin

1. Open Obsidian Settings
2. Navigate to Calendar Plugin settings
3. Click the **+** button to add a new calendar
4. Paste your ICS URL
5. Click the color picker to choose a color for this calendar
6. Repeat for additional calendars

### Configuration Options

- **Refresh Interval** - How often to fetch new calendar data (default: 30 minutes)
- **Calendar URLs** - Manage your list of ICS calendar feeds with custom colors
- **Reorder Calendars** - Use the up/down arrows to reorder your calendar list

## Usage

### Opening the Calendar View

- Click the calendar icon in the left ribbon, or
- Use the command palette (Cmd/Ctrl + P) and search for "Open Calendar View"

### Understanding the Display

- **All-day events** appear at the top with "All day" as the time
- **Timed events** are sorted by start time
- **Colored bars** on the left of each event match the calendar's assigned color
- **Join Meeting** button appears for events with detected video conference links
- **Guest count** shows how many attendees are invited

### Tips

- The plugin shows events for **today only** (based on your system time)
- Events automatically refresh based on your configured interval
- Hover over events for a subtle elevation effect
- Click "Join Meeting" to open conference links in your browser

## Development

### Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Obsidian (for testing)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-calendar.git
cd obsidian-calendar

# Install dependencies
yarn install

# Start development mode (watches for changes)
yarn dev

# Build for production
yarn build
```

### Development Workflow

1. Run `yarn dev` to start the development server
2. The plugin will rebuild automatically when you save changes
3. In Obsidian, reload the plugin to see your changes (Cmd/Ctrl + R)

### Testing in Obsidian

1. Create a symbolic link from your development folder to your test vault:
   ```bash
   ln -s /path/to/obsidian-calendar /path/to/test-vault/.obsidian/plugins/obsidian-calendar
   ```
2. Enable the plugin in your test vault
3. Changes will reflect after reloading Obsidian

### Project Structure

```
obsidian-calendar/
├── src/
│   ├── constants.ts           # Plugin constants and defaults
│   ├── main.ts                # Main plugin class
│   ├── types.ts               # TypeScript interfaces
│   ├── settings/              # Settings UI components
│   │   ├── CalendarSettingTab.ts
│   │   └── settingsHelpers.ts
│   ├── utils/                 # Utility functions
│   │   ├── arrayHelpers.ts
│   │   └── calendarHelpers.ts
│   └── views/                 # View components
│       └── CalendarView.ts
├── styles.css                 # Plugin styles
└── manifest.json              # Plugin metadata
```

### Release Process

```bash
# Patch version (0.1.0 -> 0.1.1)
yarn release-patch

# Minor version (0.1.0 -> 0.2.0)
yarn release-minor

# Major version (0.1.0 -> 1.0.0)
yarn release-major
```

## Troubleshooting

### Events Not Showing

- Verify your ICS URL is correct and accessible
- Check that the calendar contains events for today
- Ensure the calendar is not private/requires authentication
- Check the browser console for error messages

### Calendar Not Refreshing

- Check your refresh interval setting
- Manually refresh by closing and reopening the calendar view
- Verify your internet connection

### Recurring Events Missing

- Ensure you're checking on the correct date
- Some calendar providers may not include future recurring instances in their ICS feeds
- Try re-adding the calendar URL

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have feature requests, please [open an issue](https://github.com/yourusername/obsidian-calendar/issues) on GitHub.
