import { useScrollReveal } from "../hooks/use-scroll-reveal";
import { Nav } from "../components/landing/Nav";
import { HeroCarousel } from "../components/landing/HeroCarousel";
import { TruthSection } from "../components/landing/TruthSection";
import { WhyMatters } from "../components/landing/WhyMatters";
import { NeighbourhoodSignals } from "../components/landing/NeighbourhoodSignals";
import { HowItWorks } from "../components/landing/HowItWorks";
import { PlacesGallery } from "../components/landing/PlacesGallery";
import { NominationAsk } from "../components/landing/NominationAsk";
import { NeighbourhoodFeed } from "../components/landing/NeighbourhoodFeed";
import { NeighbourhoodListener } from "../components/landing/NeighbourhoodListener";
import { WhatKayaaIs } from "../components/landing/WhatKayaaIs";
import { CityWaitlist } from "../components/landing/CityWaitlist";
import { Footer } from "../components/landing/Footer";
import { WaitlistModal } from "../components/landing/WaitlistModal";
import { StickyMobileCTA } from "../components/landing/StickyMobileCTA";

export default function LandingPage() {
  useScrollReveal();
  return (
    <div style={{ background: "var(--midnight)", minHeight: "100dvh", color: "var(--warm-white)", width: "100%" }}>
      <Nav />
      <HeroCarousel />
      <TruthSection />
      <WhyMatters />
      <NeighbourhoodSignals />
      <HowItWorks />
      <PlacesGallery />
      <NominationAsk />
      <NeighbourhoodFeed />
      <NeighbourhoodListener />
      <WhatKayaaIs />
      <CityWaitlist />
      <Footer />
      <WaitlistModal />
      <StickyMobileCTA />
    </div>
  );
}
