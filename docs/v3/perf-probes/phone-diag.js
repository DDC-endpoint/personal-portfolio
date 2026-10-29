(async () => {
  const out = [];
  const log = (k, v) => { out.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`); };
  const step = async (k, f) => { const t = performance.now(); try { const v = await f(); log(k, `ok ${Math.round(performance.now() - t)}ms ${v ?? ""}`); return v; } catch (e) { log(k, `FAIL ${e && e.name}: ${e && e.message}`); return undefined; } };
  const p = document.querySelector("[data-portrait]");
  const r = p && p.getBoundingClientRect();
  log("ua", navigator.userAgent);
  log("dpr / vw / vh", [devicePixelRatio, innerWidth, innerHeight]);
  log("portrait state", p && { state: p.dataset.state, prepared: p.hasAttribute("data-prepared"), rect: [r.x, r.y, r.width, r.height].map(Math.round), label: p.textContent });
  log("curtain", document.querySelector("[data-curtain]")?.dataset.curtain);
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim();
  log("font family", family);
  const res = await step("fetch", async () => { const x = await fetch("/hero/portrait.webp"); if (!x.ok) throw new Error("status " + x.status); return x; });
  const blob = res && await step("blob", async () => { const b = await res.blob(); window.__b = b; return b; });
  if (blob) log("blob", { size: blob.size, type: blob.type });
  const full = blob && await step("createImageBitmap(blob)", async () => { const b = await createImageBitmap(blob); const s = `${b.width}x${b.height}`; b.close(); return s; });
  const rs = blob && await step("createImageBitmap resize", async () => { const b = await createImageBitmap(blob, { resizeWidth: 294, resizeHeight: 240, resizeQuality: "high" }); window.__rb = b; return `${b.width}x${b.height}`; });
  await step("fonts.load", async () => { const f = await Promise.race([document.fonts.load(`700 6px ${family}`), new Promise((_, j) => setTimeout(() => j(new Error("timeout 8s")), 8000))]); return `${f.length} faces`; });
  log("fonts.status", document.fonts.status);
  if (window.__rb) await step("readback", async () => {
    const c = document.createElement("canvas"); c.width = 294; c.height = 240;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(window.__rb, 0, 0, 294, 240);
    const d = x.getImageData(0, 0, 294, 240).data;
    let opaque = 0, sum = 0;
    for (let i = 3; i < d.length; i += 4) { if (d[i] > 76) opaque++; sum += d[i - 1]; }
    return `opaque ${opaque} of ${d.length / 4}, mean blue ${Math.round(sum / (d.length / 4))}`;
  });
  console.log(out.join("\n"));
  return out.join("\n");
})();
