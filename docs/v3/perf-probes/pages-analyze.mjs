// Summarise pages-audit.mjs runs. usage: node docs/v3/perf-probes/pages-analyze.mjs <json>...
import { readFileSync } from "node:fs";

const ACTIVE = new Set(["decoding", "dissolving", "scrambling"]);
const q = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const f = (x) => (Number.isFinite(x) ? Math.round(x) : "-");
const inAny = (t, wins) => wins.some(([a, b]) => t >= a && t <= b);

// Union of intervals where any card is mid-decode.
function decodeWindows(ev, end) {
  const state = new Map(), wins = [];
  let open = null;
  for (const [t, k, v, i] of ev) {
    if (k !== "decode") continue;
    state.set(i, v);
    const any = [...state.values()].some((s) => ACTIVE.has(s));
    if (any && open === null) open = t;
    if (!any && open !== null) { wins.push([open, t]); open = null; }
  }
  if (open !== null) wins.push([open, end]);
  return wins;
}
const stats = (dts) => `n ${dts.length} med ${q(dts, 0.5)?.toFixed(1)} p95 ${q(dts, 0.95)?.toFixed(1)} >33:${dts.filter((d) => d > 33.4).length} >50:${dts.filter((d) => d > 50).length} max ${f(Math.max(...dts, 0))}`;

for (const file of process.argv.slice(2)) {
  for (const r of JSON.parse(readFileSync(file, "utf8"))) {
    const at = (k, v) => r.ev.find(([, kk, vv]) => kk === k && vv === v)?.[0];
    const idle = at("curtain", "idle"), lift = at("curtain", "lifting");
    const lcp = r.lcp.at(-1);
    console.log(`\n=== ${r.label} ${r.mode} ${r.path}  (${r.down} kbps/${r.rtt} ms, cpu ${r.cpu}×, ${r.vp.w}×${r.vp.h})`);
    console.log(`load: ttfb ${f(r.nav.ttfb)} fcp ${f(r.nav.fcp)} lcp ${f(lcp?.[0])} [${lcp?.[1]}] cls ${r.cls.toFixed(3)} dcl ${f(r.nav.dcl)} | lift ${f(lift)} idle ${f(idle)} failsafe ${r.failsafe ? f(r.failsafe) : "no"} | portrait ${r.ev.filter(([, k]) => k === "portrait").map(([t, , v]) => `${v}@${f(t)}`).join(" ")}`);
    const loadFr = r.frames.filter(([t]) => t <= (idle ?? r.scrollStart)).map(([, d]) => d);
    const liftFr = lift && idle ? r.frames.filter(([t]) => t >= lift && t <= idle).map(([, d]) => d) : [];
    console.log(`  rAF to idle: ${stats(loadFr)}`);
    if (liftFr.length) console.log(`  rAF lift:    ${stats(liftFr)}`);
    const loafLoad = r.loaf.filter((l) => l.t <= (idle ?? r.scrollStart));
    console.log(`  LoAF to idle: ${loafLoad.length} entries, ${f(loafLoad.reduce((s, l) => s + l.d, 0))} ms, blocking ${f(loafLoad.reduce((s, l) => s + l.b, 0))} ms, longest ${f(Math.max(0, ...loafLoad.map((l) => l.d)))}`);

    const wins = decodeWindows(r.ev, r.scrollEnd).filter(([a]) => a >= r.scrollStart);
    const scrollFr = r.frames.filter(([t]) => t >= r.scrollStart && t <= r.scrollEnd);
    const dec = scrollFr.filter(([t]) => inAny(t, wins)).map(([, d]) => d);
    const gest = scrollFr.filter(([t]) => inAny(t, r.gestures.map(([a, b]) => [a, b + 600]))).map(([, d]) => d);
    const sw = [];
    for (const t of r.sc || []) { if (t < r.scrollStart) continue; const l = sw.at(-1); if (l && t - l[1] <= 100) l[1] = t; else sw.push([t, t]); }
    const moving = sw.filter(([a, b]) => b - a > 50);
    const decTime = wins.reduce((s, [a, b]) => s + b - a, 0);
    console.log(`scroll: ${r.steps} steps, ${f((r.scrollEnd - r.scrollStart) / 1000)} s; decode windows ${wins.length} (${f(decTime)} ms); previews ${r.ev.filter(([, k, v]) => k === "preview" && v === "full").length}`);
    console.log(`  rAF all scroll:  ${stats(scrollFr.map(([, d]) => d))}`);
    console.log(`  rAF gestures:    ${stats(gest)}`);
    console.log(`  rAF scrolling:   ${stats(scrollFr.filter(([t]) => inAny(t, moving)).map(([, d]) => d))}`);
    if (dec.length) console.log(`  rAF in decodes:  ${stats(dec)}`);
    const loafS = r.loaf.filter((l) => l.t >= r.scrollStart && l.t <= r.scrollEnd);
    const loafD = loafS.filter((l) => inAny(l.t, wins));
    console.log(`  LoAF scroll: ${loafS.length} (${f(loafS.reduce((s, l) => s + l.d, 0))} ms, longest ${f(Math.max(0, ...loafS.map((l) => l.d)))}); in decodes ${loafD.length} (${f(loafD.reduce((s, l) => s + l.d, 0))} ms)`);
    const by = new Map();
    for (const l of loafS) for (const s of l.s) { const k = `${s.inv} ${s.fn || ""} ${s.url}:${s.pos}`; by.set(k, (by.get(k) || 0) + s.d); }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length) console.log("  top LoAF scripts (scroll): " + top.map(([k, v]) => `${f(v)}ms ${k}`).join(" | "));
    const render = loafS.reduce((s, l) => s + l.r, 0), script = loafS.reduce((s, l) => s + l.s.reduce((x, y) => x + y.d, 0), 0);
    console.log(`  LoAF split: script ${f(script)} ms, render (style/layout/paint) ${f(render)} ms`);

    if (r.present?.anchorTs) {
      // Trace ms → page ms: the anchor mark was at scrollStart.
      const off = r.present.anchorTs - r.scrollStart;
      const pf = r.present.frames.map((t) => t - off).filter((t) => t >= r.scrollStart && t <= r.scrollEnd);
      const within = (wl) => {
        let n = 0, gaps = [], ms = 0;
        for (const [a, b] of wl) { const fr = pf.filter((t) => t >= a && t <= b); n += fr.length; ms += b - a; for (let i = 1; i < fr.length; i++) gaps.push(fr[i] - fr[i - 1]); }
        return `${n} frames / ${f(ms)} ms = ${f((1000 * n) / ms)} fps, gaps >33:${gaps.filter((g) => g > 33.4).length} >50:${gaps.filter((g) => g > 50).length} max ${f(Math.max(0, ...gaps))}`;
      };
      console.log(`  presented, while scrolling:  ${within(moving)}`);
      if (wins.length) console.log(`  presented, decodes:          ${within(wins)}`);
    }
  }
}
