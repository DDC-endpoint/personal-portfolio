// Public images with a long cache. next.config.mjs hashes every file under
// public/hero, public/projects and public/photography at build time and
// serves those folders as immutable for a year; each URL carries its file's
// hash, so a replaced image is a new URL and shows at once, while a return
// visit never re-checks an unchanged one (the live site revalidated every
// image on every visit). Without the map (unit tests) the path is bare.
const versions = JSON.parse(process.env.ASSET_VERSIONS || "{}");

export const asset = (path) => (versions[path] ? `${path}?v=${versions[path]}` : path);
