import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ClientEnhancements from "@/components/ClientEnhancements";
import { EMAIL } from "@/lib/site";

// The privacy notice (docs/v3/seo-geo.md): the site runs Google Analytics and
// takes enquiries by email and WhatsApp, so it says plainly what that means.
// Update UPDATED whenever the text changes.
const UPDATED = "27 October 2026";

export const metadata = {
  title: "Privacy | Damian De Cruz",
  description: "What damiandc.com collects (Google Analytics, and what you send by email or WhatsApp), why, and how to ask for it to be removed.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy | Damian De Cruz",
    type: "website",
    url: "/privacy",
    siteName: "Damian De Cruz",
  },
};

const SECTIONS = [
  {
    title: "Who runs this site",
    body: [
      "damiandc.com is run by Damian De Cruz, a freelance web designer in Colombo, Sri Lanka, trading as DDC Web Services. For anything about your data, email me.",
    ],
  },
  {
    title: "Analytics",
    body: [
      "The site uses Google Analytics to count visits and see which pages are read. It records the pages you view, roughly where you are (country and city), your device and browser, and the site that sent you here. It sets cookies to tell visits apart.",
      "I use this only to improve the site. There are no ads, and I don't sell or share the data. Google processes it under its own privacy policy.",
    ],
  },
  {
    title: "When you get in touch",
    body: [
      "If you email or message me on WhatsApp, I receive what you send: your name, your email address or phone number, and your message. I use it only to reply, scope and quote your project, and keep it for as long as the enquiry or project needs, plus any records the law requires.",
    ],
  },
  {
    title: "Server logs and your settings",
    body: [
      "Like most websites, the server keeps standard access logs (IP address, time, page requested and browser) to keep the site secure and fix errors.",
      "Your light or dark theme choice is saved in your own browser and never sent anywhere.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can block analytics cookies in your browser settings, or install Google’s opt-out add-on. You can also ask me what I hold about you, or ask me to delete it, by email.",
    ],
  },
];

export default function PrivacyPage() {
  const link = "text-electric link-line";
  return (
    <>
      <ClientEnhancements />
      <Nav />
      <main className="relative">
        <section className="px-6 md:px-10 pt-40 md:pt-56 pb-24 md:pb-36">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-3">
              <div className="section-label">Privacy</div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">Updated {UPDATED}</div>
            </div>
            <div className="col-span-12 md:col-span-9 md:col-start-4 max-w-2xl">
              <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">Privacy</h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-ink-soft">
                What this site collects, why, and how to have it removed. In short: visit statistics, and whatever
                you choose to send me.
              </p>
              {SECTIONS.map((s) => (
                <div key={s.title} className="mt-12 border-t border-rule pt-8">
                  <h2 className="font-display text-2xl md:text-3xl text-ink">{s.title}</h2>
                  {s.body.map((p) => (
                    <p key={p} className="mt-4 text-base md:text-lg leading-relaxed text-ink-soft">
                      {p}
                    </p>
                  ))}
                </div>
              ))}
              <div className="mt-12 border-t border-rule pt-8 flex flex-col gap-3 font-mono text-[12px] tracking-[0.08em]">
                <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Privacy request — damiandc.com")}`} className={link}>
                  {EMAIL}
                </a>
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={link}>
                  Google’s privacy policy ↗
                </a>
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className={link}>
                  Google Analytics opt-out add-on ↗
                </a>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
