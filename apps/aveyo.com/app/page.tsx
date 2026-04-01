import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SpendLess from "@/components/SpendLess";
import SavingsCalculator from "@/components/SavingsCalculator";
import Benefits from "@/components/Benefits";
import LifestyleGallery from "@/components/LifestyleGallery";
import PricingPlans from "@/components/PricingPlans";
import AerialView from "@/components/AerialView";
import Misconceptions from "@/components/Misconceptions";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <SpendLess />
      <Benefits />
      {/* <LifestyleGallery /> */}
      <PricingPlans />
      <AerialView />
      <Misconceptions />
      <Testimonials />
      <CTASection />
      <Footer />
    </main>
  );
}

