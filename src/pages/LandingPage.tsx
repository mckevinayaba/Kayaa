import { useScrollReveal } from "../hooks/use-scroll-reveal";
import { Nav } from "../components/landing/Nav";
import { HeroCarousel } from "../components/landing/HeroCarousel";
import { CheckInCTA } from "../components/landing/CheckInCTA";
import { TruthSection } from "../components/landing/TruthSection";
import { EditorialPhotoBreak } from "../components/landing/EditorialPhotoBreak";
import { HowItWorks } from "../components/landing/HowItWorks";
import { AppProof } from "../components/landing/AppProof";
import { PlacesGallery } from "../components/landing/PlacesGallery";
import { ValueStack } from "../components/landing/ValueStack";
import { ForOwners } from "../components/landing/ForOwners";
import { ResearchBrief } from "../components/landing/ResearchBrief";
import { SocialProof } from "../components/landing/SocialProof";
import { CityWaitlist } from "../components/landing/CityWaitlist";
import { Footer } from "../components/landing/Footer";

export default function LandingPage() {
  useScrollReveal();
  return (
    <div style={{ background: "#0D1117", minHeight: "100dvh", color: "#F0F6FC" }}>
      <Nav />
      <HeroCarousel />
      <CheckInCTA />
      <TruthSection />
      <EditorialPhotoBreak />
      <HowItWorks />
      <AppProof />
      <PlacesGallery />
      <ValueStack />
      <ForOwners />
      <ResearchBrief />
      <SocialProof />
      <CityWaitlist />
      <Footer />
    </div>
  );
}
