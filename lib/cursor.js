// Shared state for the custom cursor (components/Cursor.jsx). The ring's
// eased position is written here every frame so the hero portrait's lens can
// sit exactly under the ring as it grows into the lens.

export const ring = { x: 0, y: 0 };

// The custom ring is on screen: Cursor mounted (it skips reduced motion and
// forced colours) and the viewport is wider than the CSS cut-off at 768px.
export const customCursorShown = () =>
  document.documentElement.classList.contains("js-cursor") &&
  window.matchMedia("(min-width: 769px)").matches;
