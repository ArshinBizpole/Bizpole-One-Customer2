// Where to place a header popup (notifications, profile menu) that hangs from
// its button's right edge, so it stays fully on screen on narrow phones.
// `overhang`: how far the popup's right edge would normally sit past the button's.
// Returns the CSS `right` (relative to the button's box), the width to use, and
// the popup's right edge in screen coordinates.
export function popoverPlacement(anchorEl, width, { margin = 12, overhang = 0 } = {}) {
  const vw = window.innerWidth;
  const w = Math.min(width, vw - margin * 2);
  const anchorRight = anchorEl.getBoundingClientRect().right;
  const panelRight = Math.min(Math.max(anchorRight + overhang, margin + w), vw - margin);
  return { right: anchorRight - panelRight, width: w, panelRight };
}
