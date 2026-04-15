# Yu-Gi-Oh! Card Website — Implementation Plan

## Phase 1: Parallel Implementation (3 Coders)

### Coder 1: Server + Package Setup
- Create `projects/yugioh-cards/package.json` with express dependency
- Create `projects/yugioh-cards/server.js`:
  - Express server on port 3001
  - Static file serving from `public/`
  - `GET /api/cards` — proxy to YGOPRODeck cardinfo.php with query params (fname, type, attribute, level, num=20, offset)
  - `GET /api/cards/random` — proxy to randomcard.php
  - `GET /api/cards/:id` — proxy to cardinfo.php?id=X
  - Error handling for API failures

### Coder 2: HTML + CSS
- Create `projects/yugioh-cards/public/index.html`:
  - Header with logo/title, nav (Browse, Favorites)
  - Search bar + filter controls (type dropdown, attribute dropdown, level dropdown)
  - Card grid container
  - Pagination controls
  - Card detail modal (hidden by default)
  - Script tags for all JS modules
- Create `projects/yugioh-cards/public/css/styles.css`:
  - Dark purple-black gradient background
  - Gold accent colors (#d4af37)
  - Responsive card grid (CSS Grid: 1-2 cols mobile, 3 tablet, 4-5 desktop)
  - Card styling with hover effects and attribute-colored borders
  - Modal styling with backdrop blur
  - Filter bar styling
  - Pagination styling
  - Favorites heart icon
  - Loading spinner
  - Smooth transitions and animations

### Coder 3: JavaScript Modules
- Create `projects/yugioh-cards/public/js/api.js`:
  - `fetchCards(params)` — GET /api/cards with query string
  - `fetchCardById(id)` — GET /api/cards/:id
  - `fetchRandomCard()` — GET /api/cards/random
  - Error handling, loading state callbacks
- Create `projects/yugioh-cards/public/js/cards.js`:
  - `renderCardGrid(cards)` — render cards into grid container
  - `createCardElement(card)` — create single card DOM element with image, name, type, favorite button
  - `renderPagination(currentPage, totalPages)` — pagination controls
- Create `projects/yugioh-cards/public/js/detail.js`:
  - `openDetailModal(card)` — populate and show modal
  - `closeDetailModal()` — hide modal
  - Event listeners for close button, backdrop, Escape key
  - Display: image, name, type, attribute, level, ATK/DEF, race, description
- Create `projects/yugioh-cards/public/js/filters.js`:
  - `initFilters()` — set up event listeners on search input and dropdowns
  - `getActiveFilters()` — return current filter state
  - Debounced search (300ms)
  - Filter change triggers card reload
- Create `projects/yugioh-cards/public/js/favorites.js`:
  - `getFavorites()` — read from localStorage
  - `toggleFavorite(cardId)` — add/remove from favorites
  - `isFavorite(cardId)` — check if favorited
  - `renderFavoritesView()` — show only favorited cards
- Create `projects/yugioh-cards/public/js/app.js`:
  - Initialize all modules on DOMContentLoaded
  - Navigation between Browse and Favorites views
  - Coordinate card loading with filters + pagination
  - Handle initial page load

## Phase 2: Code Review
- Review all files for integration issues
- Check API proxy works with real YGOPRODeck endpoints
- Verify HTML references correct JS/CSS paths
- Check responsive layout
- Verify modal open/close works

## Phase 3: Verification
- npm install
- Start server
- Test with Playwright: load page, search, filter, open detail, favorite
