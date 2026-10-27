// Single source of truth for site-wide constants reused across components.
// Update these here rather than hunting through individual sections.

export const YEAR = 2026;
export const SHORT_YEAR = String(YEAR).slice(2); // "26"

export const EMAIL = "hello@damiandc.com";

// WhatsApp click-to-chat ("WhatsApp API" link). Number must be full
// international format, digits only — country code + number, no "+", spaces,
// or leading 0. Sri Lanka country code is 94 (e.g. 077 123 4567 -> 94771234567).
export const WHATSAPP = "94777120272";
export const WHATSAPP_MESSAGE = "Hi Damian, I'm interested in a website —";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export const AVAILABILITY = `Available · ${YEAR}`;

// Desktop + mobile navigation — in-page scroll anchors only. Hrefs start with
// "#" (anchors on the homepage); Nav rewrites them to "/#id" when viewed from
// another route. The Services page is intentionally NOT here — it's a separate
// route, so it's surfaced via in-page links instead of cluttering the nav and
// breaking the smooth-scroll feel.
export const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { href: "#timeline", label: "Timeline" },
  { href: "#resume", label: "Résumé" },
  { href: "#contact", label: "Contact" },
];

// Social channels — also the Person's `sameAs` in lib/structuredData.js (minus Discord).
export const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/damian-de-cruz/", handle: "@damian-de-cruz" },
  { label: "GitHub", href: "https://github.com/EnderGuardian25", handle: "@EnderGuardian25" },
  { label: "Instagram", href: "https://www.instagram.com/damian._.dc", handle: "@damian._.dc" },
  { label: "Discord", href: "https://discord.com/users/1123626535786659910", handle: "enderguardian_22" },
];
