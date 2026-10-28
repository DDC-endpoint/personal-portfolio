import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ClientEnhancements from "@/components/ClientEnhancements";
import ScrollProgress from "@/components/ScrollProgress";
import Portfolio from "@/components/portfolio/Portfolio";
import { ldJson } from "@/lib/jsonld";
import { portfolioGraph } from "@/lib/structuredData";
import { SHARE } from "@/lib/shareImages";

// Every project, live and upcoming (docs/v3/plan-phase-6.md → Task 5). The
// share card reuses Home's until a portfolio card is made (builder's call 6).
const TITLE = "Portfolio: Websites by Damian De Cruz | DDC Web Services";
const DESCRIPTION =
  "Every website I’ve designed and built: client sites, concepts and my own tools, from Colombo, Sri Lanka.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/portfolio" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/portfolio",
    siteName: "Damian De Cruz",
    images: [SHARE.home],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SHARE.home.url],
  },
};

export default function PortfolioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(portfolioGraph()) }} />
      <ClientEnhancements />
      <ScrollProgress />
      <Nav />
      <main className="relative">
        <Portfolio />
        <Footer />
      </main>
    </>
  );
}
