# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm install          # Install dependencies (esbuild)
npm run build        # Build JS and CSS bundles
npm run build:js     # Build only JS bundle
npm run build:css    # Build only CSS bundle
npm run watch        # Watch mode for development (auto-rebuild)
```

Build outputs:
- `js/app.bundle.js` - Minified JS bundle (IIFE format)
- `styles/app.bundle.css` - Minified CSS bundle

## Architecture

### State Management
The app uses a centralized store pattern (`js/state.js`). The `State` singleton:
- Holds all application data (tasks, filters, metadata)
- Provides pub/sub via `State.subscribe(event, callback)` returning an unsubscribe function
- Events: `tasks`, `filters`, `viewMode`, `fileHandle`, `unsavedChanges`, `userConfig`
- Components subscribe to state changes and re-render accordingly

### Component Pattern
Components are singleton classes exported from `js/components/`. Each component:
- Has an `init(selector)` method called from `app.js`
- Manages its own DOM element and event listeners
- Subscribes to relevant State events
- Uses delegated event listeners where possible

### Template System
HTML templates are externalized in `templates/` and bundled at build time:
- `js/templates-bundle.js` imports all `.html` files using esbuild's `--loader:.html=text`
- `js/utils/templates.js` provides `Templates.load(name)` with caching
- Template syntax: `{{variable}}` for escaped values, `{{{raw}}}` for HTML, `{{icon:name}}` for SVG icons
- Components with templates use `async init()` and must be awaited in `app.js`

### SVG Icons
All icons are SVG in `js/utils/icons.js`:
- Use `icon('name')` function to get SVG string
- Icons use `stroke="currentColor"` to inherit text color
- CSS ensures SVG inherits color via `stroke: currentColor`

### Storage
`js/services/storage.js` handles persistence:
- Primary: File System Access API for direct file read/write
- Fallback: IndexedDB for backup and browsers without FS API
- Live save: Auto-saves 1.5s after changes when a file handle exists

### Data Flow
1. JIRA XML import → `js/parsers/jira-xml.js` → normalized ticket objects
2. Tickets stored in `State.tasks`
3. `UserConfig` (custom tags, project rules, blacklist) stored alongside tasks
4. Export as JSON with `State.toJSON()`

## File Structure

```
js/
├── app.js              # Entry point, initializes all components
├── state.js            # Global state store (singleton)
├── config.js           # Static configuration (status/priority mappings)
├── components/         # UI components (sidebar, timeline, task-table, stats)
│   └── modals/         # Modal components (import, config, report, edit-task)
├── services/           # Storage, UserConfig
├── parsers/            # JIRA XML parser
├── utils/              # DOM helpers, icons, templates, file operations
└── templates-bundle.js # Auto-generated template imports

styles/
├── index.css           # Main entry (imports all)
├── base/               # Variables, reset, utilities
├── layout/             # Container, header, sidebar, footer
└── components/         # Toolbar, notifications

templates/
├── components/         # Component templates
└── modals/             # Modal templates
```

## Key Conventions

- Pure vanilla JS, no framework
- ES modules bundled with esbuild
- French UI text and comments
- Components use `_` prefix for private methods
- DOM utils in `js/utils/dom.js`: `$`, `$$`, `setHtml`, `addClass`, `removeClass`, `delegate`
