import { Instrument_Serif, Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import MotionProvider from "@/components/MotionProvider";
import PageTransitions from "@/components/transition/PageTransitions";
import { ldJson } from "@/lib/jsonld";
import { siteGraph } from "@/lib/structuredData";
import { SHARE } from "@/lib/shareImages";

const GA_ID = "G-PC1HZKKSEC";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Site-wide defaults, which are Home's. Each page sets its own canonical and
// og:url, so a page that forgets one (the 404, say) never points at Home.
export const metadata = {
  title: "Damian De Cruz — Freelance Web Designer & Developer",
  description: "Freelance web designer and developer in Colombo, Sri Lanka. Custom, fast websites for businesses and creatives, often live in 2–3 days. See work and prices.",
  metadataBase: new URL("https://damiandc.com"),
  openGraph: {
    title: "Damian De Cruz — Freelance Web Designer & Developer",
    description: "Freelance web designer and developer in Colombo, Sri Lanka. Custom, fast websites for businesses and creatives, often live in 2–3 days. See work and prices.",
    type: "website",
    siteName: "Damian De Cruz",
    images: [SHARE.home],
  },
  twitter: {
    card: "summary_large_image",
    title: "Damian De Cruz — Freelance Web Designer & Developer",
    description: "Freelance web designer and developer in Colombo, Sri Lanka. Custom, fast websites for businesses and creatives, often live in 2–3 days. See work and prices.",
    images: [SHARE.home.url],
  },
};

// Runs before first paint so the saved/system theme is applied with no flash.
// Also stamps `js` on <html> — CSS uses it to hide JS-dependent chrome (the
// first-load curtain) from no-JS visitors before anything ever renders — and
// `ddc-seen` once this tab has had its full loader (lib/loader.js), so a
// reload's first paint is the short loader.
const themeScript = `(function(){document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}try{if(sessionStorage.getItem('ddc-loaded'))document.documentElement.classList.add('ddc-seen');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      {/* No scripts of ours in <head>. Browser extensions inject their own
          scripts there before React loads; React skips them unless it can
          mistake one for a script of ours, and then hydration fails. The theme
          script opens <body> instead (it still runs before anything paints),
          and the structured data closes it, as Next's JSON-LD guide does. */}
      <head />
      <body className="font-sans bg-ivory text-ink antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* lazyOnload keeps the 163KB gtag bundle off the main thread until
            after `load` — page views still fire; only visitors who bounce
            within the first ~1–2s are missed. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="lazyOnload"
        />
        <Script id="ga-init" strategy="lazyOnload">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
        </Script>
        <div className="grain" aria-hidden />
        <div className="top-fade" aria-hidden />
        <MotionProvider>
          {children}
          {/* The page transition's curtain (and the first-load loader): persists
              across client-side page changes, so it can cover one page and reveal the next. */}
          <PageTransitions />
        </MotionProvider>
        {/* The site's structured data: the WebSite, Damian and his business
            (lib/structuredData.js). Pages add their own nodes by @id. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(siteGraph()) }} />
      </body>
    </html>
  );
}
