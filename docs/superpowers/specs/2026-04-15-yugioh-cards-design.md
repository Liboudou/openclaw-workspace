# Yu-Gi-Oh! Card Website — Design Spec

## Overview

A Yu-Gi-Oh! card browsing website powered by the YGOPRODeck API. Users can search, filter, browse, and favorite cards with a premium dark theme inspired by the Yu-Gi-Oh! aesthetic.

## Architecture

- **Server:** Express 4.x serving static files + proxying API calls to YGOPRODeck
- **Frontend:** Vanilla HTML/CSS/JS — no framework
- **Data:** YGOPRODeck API v7 (`https://db.ygoprodeck.com/api/v7/cardinfo.php`)
- **Persistence:** localStorage for favorites (no database)

## Features

### Card Browser
- Responsive grid of card images with name and type overlay
- Paginated: 20 cards per page with prev/next controls
- Default view shows popular cards

### Search
- Text input for searching by card name
- Debounced input (300ms) to avoid excessive API calls
- Results update the card grid in real-time

### Filters
- Card type: Monster, Spell, Trap
- Monster sub-filters: attribute (DARK, LIGHT, etc.), level/rank (1-12)
- Filters combine with search

### Card Detail Modal
- Opens on card click
- Shows: full card image, name, type, attribute, level/rank/link rating, ATK/DEF, race/archetype, card description/effect text
- Close via X button, backdrop click, or Escape key

### Favorites
- Heart icon on each card to toggle favorite
- Dedicated "Favorites" view showing saved cards
- Stored in localStorage as array of card IDs
- Favorites persist across sessions

### Responsive Design
- Mobile: 1-2 columns
- Tablet: 3 columns
- Desktop: 4-5 columns
- Card detail modal adapts to screen size

## Visual Design

- **Background:** Dark purple-black gradient (#1a0a2e to #0d0d0d)
- **Accents:** Gold (#d4af37) for borders, headings, active states
- **Cards:** Dark card backgrounds (#1e1e2e) with subtle gold border on hover
- **Typography:** Clean sans-serif, gold headings
- **Monster cards:** Colored borders by attribute (DARK=purple, LIGHT=yellow, FIRE=red, WATER=blue, EARTH=brown, WIND=green, DIVINE=gold)

## File Structure

```
projects/yugioh-cards/
├── package.json
├── server.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js          # Main app controller, navigation
│       ├── api.js           # API client (fetch wrapper)
│       ├── cards.js         # Card grid rendering
│       ├── detail.js        # Card detail modal
│       ├── filters.js       # Search & filter UI + logic
│       └── favorites.js     # Favorites management
```

## API Proxy Routes

| Route | Proxies To | Purpose |
|-------|-----------|---------|
| `GET /api/cards` | `cardinfo.php?num=20&offset=X&fname=Y` | Browse/search cards |
| `GET /api/cards/:id` | `cardinfo.php?id=X` | Single card detail |
| `GET /api/cards/random` | `randomcard.php` | Random card |

Query params passed through: `fname` (name search), `type` (card type), `attribute`, `level`, `num`, `offset`.

## Subagent Execution Plan

### Phase 1 — Parallel Implementation (3 coders)
- **Coder 1:** `package.json` + `server.js` (Express server with API proxy)
- **Coder 2:** `index.html` + `css/styles.css` (HTML structure + dark/gold theme)
- **Coder 3:** All JS modules (`api.js`, `cards.js`, `detail.js`, `filters.js`, `favorites.js`, `app.js`)

### Phase 2 — Review
- **Reviewer:** Code review all files, verify integration, check for issues

### Phase 3 — Verification
- Start server and test in browser via Playwright
