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

export type AerialViewCard = {
  topText: string;
  boldLine1: string;
  boldLine2?: string;
  bottomText: string;
};

export type AerialViewContent = {
  videoUrl: string;
  headingLine1: string;
  headingLine2: string;
  subtitle: string;
  body: string;
  cards: AerialViewCard[];
};

/** Media + copy for the Spend Less carousel on marketing pages. */
export type SpendLessSlide = {
  type: "image" | "video";
  src: string;
  poster?: string;
  title: string;
  description: string;
};

export type StatePageData = {
  slug: string;
  name: string;
  abbreviation: string;
  heroHeadingPrefix: string;
  heroHeadingHighlight: string;
  heroDescription: string;
  heroBackgroundImage: string;
  heroVideoUrl?: string;
  aerialImage: string;
  aerial: AerialViewContent;
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
  footerImage?: string;
  plansHeading: string;
  plansDescription: string;
  metaTitle: string;
  metaDescription: string;
  spendLessSlides: SpendLessSlide[];
};

/** Default Spend Less carousel (homepage and any page without overrides). */
export const defaultSpendLessSlides: SpendLessSlide[] = [
  {
    type: "video",
    src: "/images/web_photos/spendlessHome.mp4",
    poster: "/images/b5026257c6fa0a3b4b068cefc432973fe3966e19.png",
    title: "Your home, powered smarter.",
    description: "Solar energy that works around the clock, keeping your family comfortable and connected."
  },
  {
    type: "video",
    src: "/images/web_photos/spendlessSmartIs.mp4",
    title: "Home is where the smart is.",
    description: "Generating pure, sustainable energy means you can power more of what matters most:"
  },
  {
    type: "image",
    src: "/images/web_photos/powerup.jpg",
    title: "Power up. Bill Down.",
    description: "Power more of what you love doing at-home without worrying about your monthly bill."
  }
];

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
    heroVideoUrl: "/images/web_photos/IL/heroIL.mp4",
    footerImage: "/images/web_photos/PA/footerPA1.png",
    aerialImage: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone.jpg",
    aerial: {
      videoUrl: "/images/web_photos/IL/droneIL.mp4",
      headingLine1: "Bringing the energy",
      headingLine2: "to Illinois",
      subtitle: "Redefining What Home Solar Should Feel Like",
      body: "Helping Illinois families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
      cards: [
        { topText: "An industry-exclusive", boldLine1: "Guided From", boldLine2: "Start to Finish", bottomText: "on every system we install" },
        { topText: "We\u2019re always", boldLine1: "100%", boldLine2: "Transparent", bottomText: "through the entire process" },
        { topText: "We are", boldLine1: "Illinois", boldLine2: "Certified", bottomText: "We work with iPA-approved vendors" },
      ],
    },
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
        title: "It doesn\u2019t\nreally work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s\nexpensive",
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
    spendLessSlides: [
      {
        type: "video",
        src: "/images/web_photos/IL/heroIL.mp4",
        poster: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone3.jpg",
        title: "Your home, powered smarter.",
        description:
          "Solar energy that works around the clock, keeping your Illinois home comfortable through every season."
      },
      {
        type: "image",
        src: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone.jpg",
        title: "Home is where the smart is.",
        description:
          "Generate clean energy at home and take charge of how much you buy from the grid — from ComEd to Ameren."
      },
      {
        type: "image",
        src: "/images/web_photos/WhySolar_02_System-Design-CloseUp.jpg",
        title: "Power up. Bill down.",
        description:
          "Pair Illinois incentives with predictable payments so you can spend more on life, not kilowatt-hours."
      }
    ],
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
    heroVideoUrl: "/images/web_photos/PA/heroPA.mp4",
    footerImage: "/images/web_photos/PA/footerPA1.png",
    aerialImage: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT4.jpg",
    aerial: {
      videoUrl: "/images/web_photos/PA/dronePA.mp4",
      headingLine1: "Bringing the energy",
      headingLine2: "to Pennsylvania",
      subtitle: "Redefining What Home Solar Should Feel Like",
      body: "Helping Pennsylvania families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
      cards: [
        { topText: "An industry-exclusive", boldLine1: "Guided From", boldLine2: "Start to Finish", bottomText: "on every system we install" },
        { topText: "We\u2019re always", boldLine1: "100%", boldLine2: "Transparent", bottomText: "through the entire process" },
        { topText: "We serve", boldLine1: "Pennsylvania", boldLine2: "Homeowners", bottomText: "with local expertise and support" },
      ],
    },
    incentivesHeading: "Pennsylvania Solar Incentives That Lower Your Cost",
    incentivesDescription:
      "Between federal credits and state-level programs, Pennsylvania homeowners have strong financial reasons to go solar now.",
    incentives: [
      {
        tag: "Pennsylvania",
        title: "State Incentive",
        value: "$8K - $14K",
        description:
          "Pennsylvania homeowners may qualify for state-level solar incentive value that can land in the $8K to $14K range, depending on system size, utility territory, and program availability."
      },
      {
        tag: "Utility",
        title: "Utility Bill Swap",
   
        value: "$0 Down",
        description:
          "Swap your Duquesne light bill with a lower, fixed solar rate. Instant savings for homeowners that qualify"
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
        title: "It doesn\u2019t\nreally work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s\nexpensive",
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
    spendLessSlides: [
      {
        type: "video",
        src: "/images/web_photos/PA/slidePA.mp4",
        poster: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior.jpg",
        title: "Your home, powered smarter.",
        description:
          "Solar energy that works around the clock, keeping your Pennsylvania home comfortable and connected."
      },
      {
        type: "image",
        src: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT4.jpg",
        title: "Home is where the smart is.",
        description:
          "Generating sustainable energy means you can power more of what matters most across the Keystone State."
      },
      {
        type: "image",
        src: "/images/web_photos/PA/footerPA1.png",
        title: "Power up. Bill down.",
        description:
          "Power more of what you love at home without worrying about rising utility bills."
      }
    ],
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
    heroVideoUrl: "/images/web_photos/UT/heroUT-roofvid.mp4",
    footerImage: "/images/web_photos/PA/footerPA1.png",
    aerialImage: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone2.jpg",
    aerial: {
      videoUrl: "/images/web_photos/UT/maskedUT.mp4",
      headingLine1: "Bringing the energy",
      headingLine2: "to Utah",
      subtitle: "Redefining What Home Solar Should Feel Like",
      body: "Helping Utah families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
      cards: [
        { topText: "An industry-exclusive", boldLine1: "Guided From", boldLine2: "Start to Finish", bottomText: "on every system we install" },
        { topText: "We\u2019re always", boldLine1: "100%", boldLine2: "Transparent", bottomText: "through the entire process" },
        { topText: "We are", boldLine1: "Utah\u2019s", boldLine2: "Home Team", bottomText: "headquartered in American Fork" },
      ],
    },
    incentivesHeading: "Utah Solar Incentives That Maximize Your Savings",
    incentivesDescription:
      "Utah\u2019s solar-friendly policies and strong federal incentives make going solar an especially smart financial decision.",
    incentives: [
      {
        tag: "Utility",
        title: "Net Metering",
        value: "Bill Credit",
        description:
          "Utah\u2019s net metering program allows homeowners to earn bill credits for excess solar energy exported to the grid, reducing monthly costs further."
      },
      {
        tag: "Solar Loan",
        title: "Lock in your energy rates",
        value: "$0 Down",
        description:
          "Utah homeowners can lock in their energy rates for 20 years with a solar loan, ensuring predictable monthly payments and protection from future rate increases."
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
        title: "It doesn\u2019t\nreally work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s\nexpensive",
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
    spendLessSlides: [
      {
        type: "video",
        src: "/images/web_photos/UT/UT-drone1.mp4",
        poster: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone2.jpg",
        title: "Your home, powered smarter.",
        description:
          "Utah sunshine and smart design help your system produce when it counts — so your home stays comfortable year-round."
      },
      {
        type: "image",
        src: "/images/web_photos/Contact_01_Office-Location-Utah-Mountains.jpg",
        title: "Home is where the smart is.",
        description:
          "We are headquartered in American Fork and built for Utah neighborhoods — local expertise on every project."
      },
      {
        type: "image",
        src: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone2.jpg",
        title: "Power up. Bill down.",
        description:
          "Turn abundant sunlight into predictable energy costs and more room in your monthly budget."
      }
    ],
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
    heroVideoUrl: "/images/web_photos/CA/heroCA.mp4",
    footerImage: "/images/web_photos/CA/footerCA.png",
    aerialImage: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT2.jpg",
    aerial: {
      videoUrl: "/images/web_photos/CA/maskedCA.mp4",
      headingLine1: "Bringing the energy",
      headingLine2: "to California",
      subtitle: "Redefining What Home Solar Should Feel Like",
      body: "Helping California families take control of their energy future with honest pricing, quality installations, and hands-on support from start to finish.",
      cards: [
        { topText: "An industry-exclusive", boldLine1: "Guided From", boldLine2: "Start to Finish", bottomText: "on every system we install" },
        { topText: "We\u2019re always", boldLine1: "100%", boldLine2: "Transparent", bottomText: "through the entire process" },
        { topText: "We serve", boldLine1: "California", boldLine2: "Homeowners", bottomText: "with NEM 3.0 expertise" },
      ],
    },
    incentivesHeading: "California Solar Incentives That Work For You",
    incentivesDescription:
      "California\u2019s ambitious clean energy goals and strong incentive programs make solar one of the smartest investments a homeowner can make.",
    incentives: [
      {
        tag: "Utility",
        title: "Blackout Protection",
        value: "Bill Credit",
        description:
          "California homeowners can earn bill credits for excess solar energy exported to the grid, reducing monthly costs further."
      },
      {
        tag: "Solar Loan",
        title: "Lock in your energy rates",
        value: "$0 Down",
        description:
          "California homeowners can lock in their energy rates for 20 years with a solar loan, ensuring predictable monthly payments and protection from future rate increases."
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
        title: "It doesn\u2019t\nreally work",
        description:
          "Oh, but it does. In fact, the energy your roof produces will offset the energy your home uses."
      },
      {
        title: "It\u2019s\nexpensive",
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
    spendLessSlides: [
      {
        type: "video",
        src: "/images/web_photos/CA/slideCA.mp4",
        poster: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT3.jpg",
        title: "Your home, powered smarter.",
        description:
          "Solar plus storage helps California homeowners shift energy use away from peak rates and stay powered when it matters."
      },
      {
        type: "image",
        src: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT2.jpg",
        title: "Home is where the smart is.",
        description:
          "Generate clean power at home and lean on battery backup when the grid is stressed or time-of-use rates spike."
      },
      {
        type: "image",
        src: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT3.jpg",
        title: "Power up. Bill down.",
        description:
          "Make NEM 3.0 work for you with a system designed around real usage, incentives, and long-term savings."
      }
    ],
    metaTitle: "California Solar | Aveyo",
    metaDescription:
      "California homeowners can maximize savings with solar + battery under NEM 3.0. Explore incentives, flexible plans, and get a free quote from Aveyo."
  }
};

/** Top-nav links for state landing pages; kept in sync with `statePages`. */
export const stateNavLinks = Object.values(statePages)
  .map((state) => ({ name: state.name, href: `/${state.slug}` }))
  .sort((a, b) => a.name.localeCompare(b.name));
