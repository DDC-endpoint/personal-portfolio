// Collects uncaught page errors and console errors so a test can assert
// the page stayed clean.
export function trackErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

// Aborts (or delays) the curtain's code chunk: the only one naming its "lifting" state.
// `until`: a promise that releases it, for a test that must act while it's held.
export async function blockCurtain(page, { delay, until } = {}) {
  await page.route("**/_next/static/chunks/**", async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (!body.includes('"lifting"')) return route.fulfill({ response: res, body });
    if (delay === undefined && !until) return route.abort();
    await (until ?? new Promise((r) => setTimeout(r, delay)));
    return route.fulfill({ response: res, body }).catch(() => {});
  });
}
