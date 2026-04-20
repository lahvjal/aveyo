import type { ReactNode } from "react";

export type StateIncentive = {
  tag: string;
  title: string;
  value: string;
  description: string;
};

export type StatePlan = {
  badge?: string;
  title: string;
  subtitle: string;
  benefits: string[];
  alsoNotable: string[];
};

export type StatePageData = {
  slug: string;
  name: string;
  abbreviation: string;
  heroHeadingPrefix: string;
  heroHeadingHighlight: string;
  heroDescription: string;
  heroBackgroundImage: string;
  aerialImage: string;
  incentivesHeading: string;
  incentivesDescription: string;
  incentives: StateIncentive[];
  transparencyBody: string;
  transparencyValues: Array<{
    prefix: string;
    bold: string;
    suffix: string;
  }>;
  misconceptions: Array<{
    title: string;
    description: string;
  }>;
  plansHeading: string;
  plansDescription: string;
  metaTitle: string;
  metaDescription: string;
};

export const statePages: Record<string, StatePageData> = {
  illinois: {
    slug: "illinois",
    name: "Illinois",
    abbreviation: "IL",
    heroHeadingPrefix: "Power What Matters Most —",
    heroHeadingHighlight: "Right Here In Illinois",
    heroDescription:
      "Illinois electricity rates have risen sharply since 2021, and another rate increase is expected this summer. Take control of your energy future with Aveyo Solar and tap into Illinois' best-in-the-Midwest solar incentives.",
    heroBackgroundImage: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone3.jpg",
    aerialImage: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone.jpg",
    incentivesHeading: "Illinois Has Some of the Best Solar Incentives in the U.S.",
    incentivesDescription:
      "Between state and utility programs, Illinois homeowners can significantly reduce the upfront cost of going solar. Here\u2019s what\u2019s available.",
    incentives: [
      {
        tag: "Illinois",
        title: "Illinois Shines (State Incentive)",
        value: "$10K \u2013 $16K",
        description:
          "Through the Adjustable Block Program, you earn Solar Renewable Energy Credits (SRECs) for the energy your system produces over 15 years. For 2026\u201327, SREC is covering 20-30% depending on your utility territory."
      },
      {
        tag: "Utility",
        title: "Renewable Energy Rebate (Utility Company)",
        value: "$3,000 on AVG",
        description:
          "ComEd and Ameren customers earn $300 per kW of solar installed and $300 per kWh of battery storage when using a qualifying smart inverter."
      }
    ],
    transparencyBody:
      "Helping Illinois families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
    transparencyValues: [
      { prefix: "An industry-exclusive", bold: "Guided From Start to Finish", suffix: "on every system we install" },
      { prefix: "We\u2019re always", bold: "100% Transparent", suffix: "through the entire process" },
      { prefix: "We are", bold: "Illinois Certified", suffix: "We work with IPA-approved vendors" }
    ],
    misconceptions: [
      {
        title: "It doesn\u2019t really work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s expensive",
        description:
          "Most of the time, you can go solar without any up-front costs. After that, your payment is less than your current energy bill."
      },
      {
        title: "It\u2019s non-transferrable",
        description:
          "Transferring your solar loan is easier than you could ever imagine. In fact, it transfers as naturally as your home loan."
      }
    ],
    plansHeading: "Find a plan that works for you",
    plansDescription: "Choose from our most popular options for Illinois homeowners:",
    metaTitle: "Illinois Solar | Aveyo",
    metaDescription:
      "Take control of your energy future in Illinois. Explore state incentives, flexible plans, and get a free personalized quote from Aveyo."
  },

  pennsylvania: {
    slug: "pennsylvania",
    name: "Pennsylvania",
    abbreviation: "PA",
    heroHeadingPrefix: "Power What Matters Most —",
    heroHeadingHighlight: "Right Here In Pennsylvania",
    heroDescription:
      "Pennsylvania homeowners are no strangers to rising utility bills, and solar offers a reliable path to more predictable monthly energy costs. The state\u2019s net metering policies and federal tax incentives make going solar more affordable than ever.",
    heroBackgroundImage: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior.jpg",
    aerialImage: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT4.jpg",
    incentivesHeading: "Pennsylvania Solar Incentives That Lower Your Cost",
    incentivesDescription:
      "Between federal credits and state-level programs, Pennsylvania homeowners have strong financial reasons to go solar now.",
    incentives: [
      {
        tag: "Federal",
        title: "Federal Solar Investment Tax Credit (ITC)",
        value: "30%",
        description:
          "The federal ITC lets you deduct 30% of the total cost of your solar system from your federal taxes. This is the single largest incentive available to homeowners in Pennsylvania."
      },
      {
        tag: "State",
        title: "PA Solar Renewable Energy Credits (SRECs)",
        value: "Varies",
        description:
          "Pennsylvania\u2019s Alternative Energy Portfolio Standards require utilities to purchase SRECs, creating an ongoing revenue stream for solar system owners."
      }
    ],
    transparencyBody:
      "Helping Pennsylvania families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
    transparencyValues: [
      { prefix: "An industry-exclusive", bold: "Guided From Start to Finish", suffix: "on every system we install" },
      { prefix: "We\u2019re always", bold: "100% Transparent", suffix: "through the entire process" },
      { prefix: "We serve", bold: "Pennsylvania Homeowners", suffix: "with local expertise and support" }
    ],
    misconceptions: [
      {
        title: "It doesn\u2019t really work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s expensive",
        description:
          "Most of the time, you can go solar without any up-front costs. After that, your payment is less than your current energy bill."
      },
      {
        title: "It\u2019s non-transferrable",
        description:
          "Transferring your solar loan is easier than you could ever imagine. In fact, it transfers as naturally as your home loan."
      }
    ],
    plansHeading: "Find a plan that works for you",
    plansDescription: "Choose from our most popular options for Pennsylvania homeowners:",
    metaTitle: "Pennsylvania Solar | Aveyo",
    metaDescription:
      "Pennsylvania homeowners can save with solar. Explore state incentives, flexible plans, and get a free personalized quote from Aveyo."
  },

  utah: {
    slug: "utah",
    name: "Utah",
    abbreviation: "UT",
    heroHeadingPrefix: "Power What Matters Most —",
    heroHeadingHighlight: "Right Here In Utah",
    heroDescription:
      "Utah\u2019s abundant sunshine makes it one of the best states in the country for residential solar. Aveyo was built right here in Utah, so we know the local market, the incentives, and the communities we serve better than anyone.",
    heroBackgroundImage: "/images/web_photos/Contact_01_Office-Location-Utah-Mountains.jpg",
    aerialImage: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone2.jpg",
    incentivesHeading: "Utah Solar Incentives That Maximize Your Savings",
    incentivesDescription:
      "Utah\u2019s solar-friendly policies and strong federal incentives make going solar an especially smart financial decision.",
    incentives: [
      {
        tag: "Federal",
        title: "Federal Solar Investment Tax Credit (ITC)",
        value: "30%",
        description:
          "The federal ITC lets you deduct 30% of the total cost of your solar system from your federal taxes. This is the single largest incentive available to Utah homeowners."
      },
      {
        tag: "Utility",
        title: "Net Metering (Rocky Mountain Power)",
        value: "Bill Credit",
        description:
          "Utah\u2019s net metering program allows homeowners to earn bill credits for excess solar energy exported to the grid, reducing monthly costs further."
      }
    ],
    transparencyBody:
      "Helping Utah families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
    transparencyValues: [
      { prefix: "An industry-exclusive", bold: "Guided From Start to Finish", suffix: "on every system we install" },
      { prefix: "We\u2019re always", bold: "100% Transparent", suffix: "through the entire process" },
      { prefix: "We are", bold: "Utah\u2019s Home Team", suffix: "headquartered in American Fork" }
    ],
    misconceptions: [
      {
        title: "It doesn\u2019t really work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s expensive",
        description:
          "Most of the time, you can go solar without any up-front costs. After that, your payment is less than your current energy bill."
      },
      {
        title: "It\u2019s non-transferrable",
        description:
          "Transferring your solar loan is easier than you could ever imagine. In fact, it transfers as naturally as your home loan."
      }
    ],
    plansHeading: "Find a plan that works for you",
    plansDescription: "Choose from our most popular options for Utah homeowners:",
    metaTitle: "Utah Solar | Aveyo",
    metaDescription:
      "Utah\u2019s sunshine and Aveyo\u2019s local expertise make going solar simple. Explore incentives, flexible plans, and get a free personalized quote."
  },

  california: {
    slug: "california",
    name: "California",
    abbreviation: "CA",
    heroHeadingPrefix: "Power What Matters Most —",
    heroHeadingHighlight: "Right Here In California",
    heroDescription:
      "California residents face some of the highest electricity rates in the nation. With NEM 3.0, pairing solar with battery storage is more valuable than ever, letting you store the energy you generate and use it when rates are highest.",
    heroBackgroundImage: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT3.jpg",
    aerialImage: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT2.jpg",
    incentivesHeading: "California Solar Incentives That Work For You",
    incentivesDescription:
      "California\u2019s ambitious clean energy goals and strong incentive programs make solar one of the smartest investments a homeowner can make.",
    incentives: [
      {
        tag: "Federal",
        title: "Federal Solar Investment Tax Credit (ITC)",
        value: "30%",
        description:
          "The federal ITC lets you deduct 30% of the total cost of your solar system from your federal taxes. This is the single largest incentive available to California homeowners."
      },
      {
        tag: "State",
        title: "Self-Generation Incentive Program (SGIP)",
        value: "Varies",
        description:
          "California\u2019s SGIP provides rebates for battery storage systems, making it more affordable to pair storage with solar under NEM 3.0 and maximize savings during peak-rate hours."
      }
    ],
    transparencyBody:
      "Helping California families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
    transparencyValues: [
      { prefix: "An industry-exclusive", bold: "Guided From Start to Finish", suffix: "on every system we install" },
      { prefix: "We\u2019re always", bold: "100% Transparent", suffix: "through the entire process" },
      { prefix: "We serve", bold: "California Homeowners", suffix: "with NEM 3.0 expertise" }
    ],
    misconceptions: [
      {
        title: "It doesn\u2019t really work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s expensive",
        description:
          "Most of the time, you can go solar without any up-front costs. After that, your payment is less than your current energy bill."
      },
      {
        title: "It\u2019s non-transferrable",
        description:
          "Transferring your solar loan is easier than you could ever imagine. In fact, it transfers as naturally as your home loan."
      }
    ],
    plansHeading: "Find a plan that works for you",
    plansDescription: "Choose from our most popular options for California homeowners:",
    metaTitle: "California Solar | Aveyo",
    metaDescription:
      "California homeowners can maximize savings with solar + battery under NEM 3.0. Explore incentives, flexible plans, and get a free quote from Aveyo."
  }
};
