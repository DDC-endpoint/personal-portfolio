// The hero portrait's frames, off the page's main thread
// (components/HeroPortrait.jsx → the page side, lib/portraitRenderer.js → the
// drawing). The page hands over its canvas as an OffscreenCanvas, and then
// calls the renderer by message: { call, args, id }. A call with an id
// answers with { id, result }; the renderer's own events come back as
// { event, data }.
import { createRenderer } from "./portraitRenderer";

// What the renderer asks of the page, as the page last told it.
const host = { shown: false, ring: { x: 0, y: 0 }, revealed: () => host.shown, ringAt: () => host.ring };
let renderer = null;

self.onmessage = async ({ data: m }) => {
  if (m.call === "probe") {
    // Everything the portrait needs here; without it the page draws it itself.
    const ok =
      typeof requestAnimationFrame === "function" &&
      typeof OffscreenCanvas === "function" &&
      typeof FontFace === "function" &&
      !!self.fonts &&
      typeof createImageBitmap === "function";
    return self.postMessage({ id: m.id, result: ok });
  }
  if (m.call === "init") {
    const { canvas, faces, name, family, blob, photo, wave, theme, shown } = m.args[0];
    // The page's own font files (its @font-face rules), so the glyphs are
    // drawn in the same face. A face that can't load is skipped: the canvas
    // falls back down the family list, as on the page.
    for (const f of faces) {
      try {
        self.fonts.add(new FontFace(name, f.src, f.descriptors));
      } catch {}
    }
    await self.fonts.load(`700 6px ${family}`).catch(() => []);
    host.shown = shown;
    renderer = createRenderer({
      canvas,
      makeCanvas: (w, h) => new OffscreenCanvas(w, h),
      family,
      blob,
      photo,
      wave,
      host,
      emit: (event, data) => self.postMessage({ event, data }),
    });
    renderer.theme(theme);
    return self.postMessage({ id: m.id, result: true });
  }
  if (m.call === "host") return Object.assign(host, m.args[0]);
  if (!renderer) return;
  const result = await renderer[m.call](...(m.args || []));
  if (m.id) self.postMessage({ id: m.id, result }, result?.data?.buffer ? [result.data.buffer] : []);
};
