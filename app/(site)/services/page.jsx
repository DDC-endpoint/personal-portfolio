import ServicesNav from "@/components/ServicesNav";
import Footer from "@/components/Footer";
import Services from "@/components/Services";
import ClientEnhancements from "@/components/ClientEnhancements";
import ScrollProgress from "@/components/ScrollProgress";
import { FAQS, faqJsonLd } from "@/lib/services";
import { ldJson } from "@/lib/jsonld";

export const metadata = {
  title: "Web Design Services in Colombo | Damian De Cruz",
  description:
    "Freelance web design & development in Colombo, Sri Lanka. Custom business sites, portfolios, booking systems, and redesigns — clean, fast, and often delivered in days. Starting from LKR 18,000.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Web Design Services in Colombo | Damian De Cruz",
    description:
      "Freelance web design & development in Colombo, Sri Lanka. Custom sites, booking systems & redesigns — clean, fast, delivered in days. From LKR 18,000.",
    type: "website",
    url: "/services",
    siteName: "Damian De Cruz",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Web Design Services — Damian De Cruz" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Design Services in Colombo | Damian De Cruz",
    description:
      "Freelance web design & development in Colombo, Sri Lanka. Custom sites, booking systems & redesigns — clean, fast, delivered in days.",
    images: ["/og.jpg"],
  },
};

// JSON-LD service catalog — lists the concrete offerings with price ranges so
// Google can surface them for local "web design / developer" service searches.
const servicesJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Web Design and Development",
  provider: {
    "@type": "Person",
    name: "Damian De Cruz",
    url: "https://damiandc.com",
  },
  areaServed: { "@type": "Place", name: "Colombo, Sri Lanka" },
  url: "https://damiandc.com/services",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Web Design & Development Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Web design & development" },
        priceCurrency: "LKR",
        price: "18000",
        description: "Custom, responsive single-page and landing websites.",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Business & portfolio websites" },
        priceCurrency: "LKR",
        price: "40000",
        description: "Multi-page business and portfolio sites with SEO and contact forms.",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Booking & scheduling websites" },
        priceCurrency: "LKR",
        price: "65000",
        description: "Appointment and reservation sites with payment integration.",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Website redesigns & speed fixes" },
        priceCurrency: "LKR",
        price: "25000",
        description: "Visual refreshes and performance / Core Web Vitals optimisation.",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "SEO & AI visibility audit" },
        priceCurrency: "LKR",
        price: "50000",
        description: "On-page, technical, and GEO audit — how the site ranks on Google and surfaces in AI answers, with a priority roadmap.",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "SEO & GEO implementation" },
        priceCurrency: "LKR",
        price: "65000",
        description: "Implementation of audit recommendations — technical fixes, schema markup, and AI snippet optimisation.",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Ongoing SEO & GEO retainer" },
        priceCurrency: "LKR",
        price: "48000",
        description: "Monthly SEO health checks, GEO monitoring, content updates, and a performance report.",
      },
    ],
  },
};

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(servicesJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(faqJsonLd(FAQS)) }}
      />
      <ClientEnhancements />
      <ScrollProgress />
      <ServicesNav />
      <main className="relative">
        <Services />
        <Footer />
      </main>
    </>
  );
}
