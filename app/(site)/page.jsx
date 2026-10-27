import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Leadership from "@/components/Leadership";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Timeline from "@/components/Timeline";
import Resume from "@/components/Resume";
import Lens from "@/components/Lens";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ClientEnhancements from "@/components/ClientEnhancements";
import ScrollProgress from "@/components/ScrollProgress";
import IntroStamp from "@/components/IntroStamp";
import { ldJson } from "@/lib/jsonld";
import { homeGraph } from "@/lib/structuredData";

export const metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Damian De Cruz — Freelance Web Designer & Developer",
    description: "Freelance web designer and developer in Colombo, Sri Lanka. Custom, fast websites for businesses and creatives, often live in 2–3 days. See work and prices.",
    type: "website",
    url: "/",
    siteName: "Damian De Cruz",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Damian De Cruz — Freelance Web Designer & Developer" }],
  },
};

export default function Home() {
  return (
    <>
      <IntroStamp />
      <ClientEnhancements />
      <ScrollProgress />
      <Nav />
      <main className="relative">
        <Hero />
        <About />
        <Leadership />
        <Skills />
        <Projects />
        <Timeline />
        <Resume />
        <Lens />
        <Contact />
        <Footer />
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(homeGraph()) }} />
    </>
  );
}
