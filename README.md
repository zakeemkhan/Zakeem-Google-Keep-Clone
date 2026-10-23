# Keep Clone

A simplified Google Keep built with plain **HTML, CSS and JavaScript** — no frameworks, no build step.

## Features

* **Create notes** with an optional title, body text and one of 9 colours
* **Display notes** in a responsive grid, or switch to a single-column list view
* **Archive / unarchive** notes, with a separate Archive view and live counts
* **Edit notes** in a modal (click a note, or focus it and press Enter); colour can be changed there too
* **Delete notes** with an **Undo** toast
* **Search** across titles and content, with highlighted matches
* **Tooltips** on every icon button
* **Dark mode** and grid/list preference, remembered between visits
* **Persistent storage** via `localStorage` (notes survive page reloads)
* Keyboard accessible (Tab, Enter, Esc), ARIA labels, reduced-motion support
* Responsive: collapsible sidebar on desktop, slide-over menu on mobile

## Run it

No installation needed.

**Option 1 — open directly**
Double-click `index.html` to open it in any modern browser.

## 

## Deploy

It is a static site, so any static host works:

* **GitHub Pages:** push the folder to a repo → Settings → Pages → deploy from the `main` branch root.
* **Netlify / Vercel:** drag and drop the folder, or connect the repo (no build command, publish directory `.`).

## 

## Project structure

```
keep-clone/
├── index.html        # Semantic markup (header, nav, main, sections, dialog)
├── css/
│   └── styles.css    # Design tokens, layout, components, responsive rules
├── js/
│   └── app.js        # State, storage, note operations, rendering, events
└── README.md
```

## 

## How it works

|Concern|Approach|
|-|-|
|State|A single `state` object holds notes, current view and search query|
|Persistence|Notes are saved as JSON under the `keep-clone:notes` key|
|Rendering|`render()` rebuilds the visible list from state after every change|
|Events|Event delegation on the notes container for archive / delete / edit|
|Security|All user text is HTML-escaped before rendering|
|Theming|CSS custom properties; `data-theme="dark"` on `<html>` swaps the palette|

## 

## Usage tips

* Click **Take a note…** to expand the composer; click outside, press **Esc** or hit **Add note** to save it.
* Hover a note to reveal **Archive** and **Delete** buttons.
* Use the sidebar to switch between **Notes** and **Archive**.
* Clear all data by running `localStorage.clear()` in the browser console.

## 

## Possible extensions

Pinned notes, labels, checklists, drag-and-drop reordering, image attachments, and export/import as JSON.

