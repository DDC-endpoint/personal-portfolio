import { Instrument_Serif, Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import MotionProvider from "@/components/MotionProvider";

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

export const metadata = {
  title: "Damian De Cruz — Creative Technologist & Freelance Web Designer",
  description:
    "Damian De Cruz — freelance web designer and developer based in Colombo, Sri Lanka. Clean, fast, custom websites for businesses and creatives, delivered in days, often 2–3. Available for hire.",
  metadataBase: new URL("https://damiandc.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Damian De Cruz — Creative Technologist & Freelance Web Designer",
    description: "Freelance web designer & developer in Colombo, Sri Lanka. Clean, fast, custom websites — delivered in days, often 2–3.",
    type: "website",
    siteName: "Damian De Cruz",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Damian De Cruz — Creative Technologist & Freelance Web Designer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Damian De Cruz — Creative Technologist & Freelance Web Designer",
    description: "Freelance web designer & developer in Colombo, Sri Lanka. Clean, fast, custom websites — delivered in days, often 2–3.",
    images: ["/og.jpg"],
  },
};

// Runs before first paint so the saved/system theme is applied with no flash.
// Also stamps `js` on <html> — CSS uses it to hide JS-dependent chrome (the
// IntroStamp curtain) from no-JS visitors before anything ever renders.
const themeScript = `(function(){document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

// JSON-LD Person structured data — helps Google associate this site with
// the entity "Damian De Cruz" and link verified social profiles.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Damian De Cruz",
  url: "https://damiandc.com",
  jobTitle: "Creative Technologist",
  affiliation: {
    "@type": "EducationalOrganization",
    name: "Informatics Institute of Technology",
    alternateName: "IIT Sri Lanka",
    url: "https://www.iit.ac.lk",
  },
  alumniOf: {
    "@type": "EducationalOrganization",
    name: "University of Westminster",
    url: "https://www.westminster.ac.uk",
  },
  sameAs: [
    "https://www.linkedin.com/in/damian-de-cruz/",
    "https://github.com/EnderGuardian25",
    "https://www.instagram.com/damian._.dc",
  ],
};

// JSON-LD Service structured data — tells Google this site offers a bookable
// web design/development service in Colombo, which helps surface it for
// local "web designer / developer" service searches.
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Web Design and Development",
  name: "Freelance Web Design & Development",
  description:
    "Custom websites — design, build, and launch. Clean, fast, responsive sites for businesses and creatives, delivered in days, often 2–3.",
  url: "https://damiandc.com",
  areaServed: {
    "@type": "Place",
    name: "Colombo, Sri Lanka",
  },
  provider: {
    "@type": "Person",
    name: "Damian De Cruz",
    url: "https://damiandc.com",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
        />
      </head>
      <body className="font-sans bg-ivory text-ink antialiased">
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
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
