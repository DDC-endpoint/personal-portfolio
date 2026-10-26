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
    </>
  );
}
