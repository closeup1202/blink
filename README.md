# Blink - LinkedIn Simple Follow-up Chrome Extension

> Never lose a deal because you forgot to follow up.

A lightweight Chrome Extension that helps you manage LinkedIn follow-ups without leaving LinkedIn.

## Features

- **Status Management** - Track contacts (Contacted, Replied, Meeting Booked, Not Interested)
- **Follow-up Reminders** - Never forget to follow up again
- **Search Overlay** - See contact status directly in LinkedIn search results
- **Local Storage** - All data stored locally, no external servers

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Extension**: Chrome Manifest V3

## Project Structure

```
blink/
├── public/
│   ├── manifest.json          # Chrome Extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── background/            # Service Worker
│   ├── content/               # LinkedIn page injection
│   ├── popup/                 # Extension popup UI
│   ├── storage/               # chrome.storage wrapper
│   ├── utils/                 # Utility functions
│   ├── types/                 # TypeScript types
│   └── styles/                # Global styles
└── popup.html                 # Popup entry point
```

## Development

### Prerequisites

- Node.js 18+
- Chrome browser

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

The built extension will be in the `dist/` folder.

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder
