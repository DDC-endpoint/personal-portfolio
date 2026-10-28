// Locks the page's scroll while an overlay is open (the Lens viewer, the
// mobile menus). overflow: hidden takes the scrollbar away and widens the
// page, so the content would snap sideways (Damian, Phase 5 gate): the
// scrollbar's width goes back on as body padding, and as --lock-gap for the
// fixed bars (the headers, the scroll progress), which sit against the
// viewport rather than the body. Nested locks stack.

let depth = 0;
let saved = null;

export function lockScroll() {
  if (depth++ > 0) return;
  const html = document.documentElement, body = document.body;
  const width = body.getBoundingClientRect().width;
  saved = { overflow: body.style.overflow, padding: body.style.paddingRight };
  body.style.overflow = "hidden";
  // How much wider the page got: the scrollbar's width, or nothing where its
  // room is kept anyway (globals.css → scrollbar-gutter).
  const gap = body.getBoundingClientRect().width - width;
  if (gap > 0) {
    body.style.paddingRight = `${gap}px`;
    html.style.setProperty("--lock-gap", `${gap}px`);
  }
}

export function unlockScroll() {
  if (depth === 0 || --depth > 0) return;
  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.padding;
  document.documentElement.style.removeProperty("--lock-gap");
}
