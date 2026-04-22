import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SpendLess from "@/components/SpendLess";
import TrustSeals from "@/components/TrustSeals";
import SavingsCalculator from "@/components/SavingsCalculator";
import Benefits from "@/components/Benefits";
import LifestyleGallery from "@/components/LifestyleGallery";
import PricingPlans from "@/components/PricingPlans";
import AerialView from "@/components/AerialView";
import Misconceptions from "@/components/Misconceptions";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import {
  buildSearchParamString,
  type SearchParamRecord
} from "@/lib/plans-lead";

export default async function Home({
  searchParams
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const currentQueryString = buildSearchParamString(await searchParams);

  return (
    <main>
      <Navbar />
      <Hero />
      <SpendLess />
      <TrustSeals />
      <Benefits />
      {/* <LifestyleGallery /> */}
      <PricingPlans
        currentQueryString={currentQueryString}
        originPath="/"
        pageSlug="home"
        offerName="Aveyo Homepage Plans"
      />
      <AerialView />
      <Misconceptions />
      <Testimonials />
      <Footer />
    </main>
  );
}

