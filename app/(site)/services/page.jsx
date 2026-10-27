import ServicesNav from "@/components/ServicesNav";
import Footer from "@/components/Footer";
import Services from "@/components/Services";
import ClientEnhancements from "@/components/ClientEnhancements";
import ScrollProgress from "@/components/ScrollProgress";
import { FAQS, faqJsonLd } from "@/lib/services";
import { ldJson } from "@/lib/jsonld";
import { servicesGraph } from "@/lib/structuredData";

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
