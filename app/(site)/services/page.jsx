import ServicesNav from "@/components/ServicesNav";
import Footer from "@/components/Footer";
import Services from "@/components/Services";
import ClientEnhancements from "@/components/ClientEnhancements";
import ScrollProgress from "@/components/ScrollProgress";
import { FAQS, faqJsonLd } from "@/lib/services";
import { ldJson } from "@/lib/jsonld";
import { servicesGraph } from "@/lib/structuredData";

// The business page: DDC Web Services, the name Damian trades under
// (docs/v3/seo-geo.md). The price leads the description.
export const metadata = {
  title: "Web Design Services in Colombo | DDC Web Services",
  description: "Websites in Sri Lanka from LKR 18,000 (intl from $150): business sites, booking systems, redesigns and SEO audits by DDC Web Services, Damian De Cruz’s freelance studio in Colombo.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Web Design Services in Colombo | DDC Web Services",
    description: "Websites in Sri Lanka from LKR 18,000 (intl from $150): business sites, booking systems, redesigns and SEO audits by DDC Web Services, Damian De Cruz’s freelance studio in Colombo.",
    type: "website",
    url: "/services",
    siteName: "DDC Web Services",
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Design Services in Colombo | DDC Web Services",
    description: "Websites in Sri Lanka from LKR 18,000 (intl from $150): business sites, booking systems, redesigns and SEO audits by DDC Web Services, Damian De Cruz’s freelance studio in Colombo.",
  },
};

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(servicesGraph()) }}
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
