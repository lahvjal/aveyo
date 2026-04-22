-- Replace placeholder marketing news posts with the current exported newsfeed from the legacy site.

DELETE FROM public.marketing_news_posts;

INSERT INTO public.marketing_news_posts (
  title,
  slug,
  category,
  excerpt,
  hero_image_url,
  body_markdown,
  seo_title,
  seo_description,
  published_at,
  created_at,
  updated_at
)
VALUES
  (
    $n1title$A New CEO$n1title$,
    $n1slug$a-new-ceo$n1slug$,
    $n1category$Leadership$n1category$,
    $n1excerpt$Today is a big day for Aveyo.$n1excerpt$,
    $n1hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/69441f590ecaab6967a9cae9_AVEYO%20HEADSHOTS%2008.24%2020.jpeg$n1hero$,
    $n1body$Today is a big day for Aveyo.
We’re well aware that many of our announcements begin with a familiar theme: growth. And while that may sound repetitive, it reflects the momentum this team continues to create. That momentum brings opportunity—and today’s announcement is a direct result of it.
We are pleased to announce Dave Anderson as Aveyo’s new Chief Executive Officer.
“This marks an important milestone for Aveyo as we continue to scale with both strength and stability. Since joining the company two years ago as CFO, Dave has consistently demonstrated exceptional leadership—guiding the organization through periods of rapid growth, complex challenges, and key strategic decisions. His impact has been felt across every part of the business, and I’m confident he is the right leader to guide Aveyo through its next chapter.”
— Jeremy Hammond
“I’m stepping into a role that Jeremy has brilliantly navigated since Aveyo’s inception. His original vision laid the foundation for the company’s success and positioned Aveyo to confidently enter this next phase of growth. I’m excited to build on that solid foundation and continue driving the company forward.”
— Dave Anderson
What’s next for Jeremy: He isn’t going far. Jeremy will be transitioning into the CEO role at Caliber, one of Aveyo’s sister brands, which has experienced significant growth over the past several months. In this role, he will continue applying the same strategic leadership and operational discipline that helped build Aveyo from the ground up.
Dave and Jeremy will continue working closely together to ensure Aveyo—and each of the brands within our family of companies—maintain the innovative, disciplined, and people-first approach that defines our culture.
As always, we’re excited to see how this next evolution strengthens our teams and accelerates our shared mission.$n1body$,
    $n1seo_title$A New CEO | Aveyo News$n1seo_title$,
    $n1seo_description$Today is a big day for Aveyo.$n1seo_description$,
    TIMESTAMPTZ '2025-12-18T15:35:59+00:00',
    TIMESTAMPTZ '2025-12-18T15:35:59+00:00',
    TIMESTAMPTZ '2025-12-18T15:35:59+00:00'
  ),
  (
    $n2title$A New Site$n2title$,
    $n2slug$a-new-site$n2slug$,
    $n2category$Brand$n2category$,
    $n2excerpt$Aveyo.com — The Overhaul$n2excerpt$,
    $n2hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/677c1bb2b7363119eafce519_site-hero.png$n2hero$,
    $n2body$The Update

Welcome to aveyo.com 2.0! Alongside refreshing our site’s look and feel to align with our brand’s recent updates, we’ve focused on creating a more user-friendly platform that delivers a seamless and delightful experience for every visitor.

What’s New?

- Updated content with fresh photos and videos
- A sleek, modern layout
- An engaging brand video
- Monthly payment estimators
- A simplified estimate request form
- Easy access to the customer portal

We’ve also built a foundation for future updates, ensuring our website evolves alongside our customers’ needs.

What’s Coming Next?

- Instant Estimator: Get an estimate with just one click
- On-Site Checkout: Skip the salesperson and complete the process yourself
- Immersive Content: Dive deeper into the world of solar energy
- Enhanced User Experiences: Making every interaction even better

Our new website reflects our unwavering commitment to delivering an exceptional solar experience at every touchpoint. Whether you’re just starting your solar journey here or revisiting us mid-process, we hope you feel our dedication—not just to you, our valued customer, but also to the promise of a brighter, solar-powered future.$n2body$,
    $n2seo_title$A New Site | Aveyo News$n2seo_title$,
    $n2seo_description$Aveyo.com — The Overhaul$n2seo_description$,
    TIMESTAMPTZ '2025-01-06T18:07:01+00:00',
    TIMESTAMPTZ '2025-01-06T18:07:01+00:00',
    TIMESTAMPTZ '2025-01-06T18:07:01+00:00'
  ),
  (
    $n3title$WE’RE LAUNCHING AVA, OUR AI CHATBOT$n3title$,
    $n3slug$ava-our-ai-chatbot$n3slug$,
    $n3category$Product$n3category$,
    $n3excerpt$We’d like you to meet Ava, Aveyo’s newest innovation.$n3excerpt$,
    $n3hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/690d2a12687e7c5e80b92bd6_ava-banner.jpg$n3hero$,
    $n3body$WE’RE LAUNCHING AVA, OUR AI CHATBOT

We’d like you to meet Ava, Aveyo’s newest innovation.

INTRODUCTION

One of the major sources of friction during the solar installation process has always been communication. Or, more accurately, a lack of communication. This lack of communication occurs everywhere, between all parties: the solar company and their customers, the sales team and the operations team, the customer support team and our install partners.

At Aveyo, we’ve done a wonderful job at minimizing this friction as much as possible. We’ve created strategic tools that connect our teams and provide real-time feedback and updates. Dashboards and web apps act as resources for our customers and contractors.

In fact, creating and implementing these tools was necessary in order to make our 45 Days to Pay standard a reality. Streamlining processes to ensure, from contract signing to solar installation, is only possible with these enhanced streams of communication and information.

While we’re incredibly proud of these advancements, and the improvements they’ve made for our company, we didn’t think we could stop there. So, we dropped another innovation:

Meet Ava.

AVA AI

Ava is our all new, AI-powered chatbot. This powerful tool is designed to act as an easy-to-use resource for our customers, customer support team, and sales organization.

It lives on our website as a chat box. Simply click on the icon, type in your question, and Ava will quickly respond. If you’re logged into your account, Ava will be able to provide information specific to your project. And, if it can’t find the answer, it will direct you to someone who can.

[Add screenshot of where it lives]

Ava is designed to be a quality of life enhancement for our customers as they go through their solar process, keeping them in the know every single step of the way.

If you’re in the middle of your solar installation, head to [aveyo.com](http://aveyo.com) and see how Ava works for yourself. If you’re new to the process, ask Ava any questions you may have about any piece of the solar installation.

Meet Ava, and feel taken care of every step of the way.

[Watch video](https://www.youtube.com/watch?v=Z4bAwM7C_Mo)$n3body$,
    $n3seo_title$WE’RE LAUNCHING AVA, OUR AI CHATBOT | Aveyo News$n3seo_title$,
    $n3seo_description$We’d like you to meet Ava, Aveyo’s newest innovation.$n3seo_description$,
    TIMESTAMPTZ '2025-11-14T16:55:44+00:00',
    TIMESTAMPTZ '2025-11-05T22:27:29+00:00',
    TIMESTAMPTZ '2025-11-06T23:07:01+00:00'
  ),
  (
    $n4title$AVEYO NAMED AS UV 50’s TOP STARTUP TO WATCH$n4title$,
    $n4slug$aveyo-named-as-uv-50s-top-startup-to-watch$n4slug$,
    $n4category$Company$n4category$,
    $n4excerpt$We feel incredibly honored, and a little overwhelmed, to be named UV 50’s #1 Startup to Watch. The feeling of seeing our name at the top of that exclusive list is still sinking in, especially when we consider the giants we share this list with: massive businesses like Breeze Airways, Purple Matress, Crumbl, and Built Bar.$n4excerpt$,
    $n4hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/68e6909ff6cd20177343dc1b_UV50%20ANNOUNCEMENT%202-min-min.png$n4hero$,
    $n4body$We feel incredibly honored, and a little overwhelmed, to be named UV 50’s #1 Startup to Watch. The feeling of seeing our name at the top of that exclusive list is still sinking in, especially when we consider the giants we share this list with: massive businesses like Breeze Airways, Purple Matress, Crumbl, and Built Bar.

For those who may not be familiar with the UV 50, here’s a brief description: “The UV50 is an annual business award series created by Utah Valley BusinessQ magazine (published by Utah Valley Magazine). Each year, the UV50 recognizes 50 standout companies that are driving innovation, growth, and economic impact across Utah Valley, one of the fastest-growing business regions in the country.”

Being recognized in this way is important to us for a few reasons:

-First, it legitimizes and supports our company’s ethos, as well as our approach to changing the solar world.

-Second, it shows that people are not only watching what we’re doing, but are excited about it as well.

-It also validates our customer-centric focus, and shows that we’ve treated our consumers like they deserve to be treated.

-Finally, it acts as a motivator moving forward.

There is a new sense of responsibility that we all feel to level up our business as a whole. This award only feels as good as what we do with it. In the coming weeks, months, and years, our goal will be to build upon what we’ve been able to achieve and continue proving why we were able to get here in the first place.

Before we sign off, we would like to take a moment to thank our entire Aveyo team. Their hard work, late nights, short timelines, and impossible projects have paid off exponentially. It’s because of you that our brand even exists at all.

So, thank you to all those who have helped Aveyo become what it is, and to all those who will push it forward to what it will be tomorrow.$n4body$,
    $n4seo_title$AVEYO NAMED AS UV 50’s TOP STARTUP TO WATCH | Aveyo News$n4seo_title$,
    $n4seo_description$We feel incredibly honored, and a little overwhelmed, to be named UV 50’s #1 Startup to Watch. The feeling of seeing our name at the top of that exclusive list is still sinking in, especially when we consider the giants we share this list with: massive businesses like Breeze Airways, Purple Matress, Crumbl, and Built Bar.$n4seo_description$,
    TIMESTAMPTZ '2025-10-08T16:28:21+00:00',
    TIMESTAMPTZ '2025-10-08T16:22:12+00:00',
    TIMESTAMPTZ '2025-10-08T16:26:15+00:00'
  ),
  (
    $n5title$We Opened a New Office in Illinois$n5title$,
    $n5slug$new-office$n5slug$,
    $n5category$Expansion$n5category$,
    $n5excerpt$In order to better serve our quickly growing Illinois market, we opened a hub of operations for our various, IL-based teams.$n5excerpt$,
    $n5hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/6840d238cb51dd08d2655b8f_Screenshot%202025-06-04%20at%205.08.58%E2%80%AFPM.png$n5hero$,
    $n5body$Aveyo keeps on growing!

We’re pleased to announce the grand opening of our newest Aveyo office in Springfield, Illinois.

5.22.25 – Springfield, Illinois

Aveyo, a leading residential solar provider based in Utah, is proud to announce the opening of a new office in Springfield, Illinois. This recent corporate expansion comes in response to years of unprecedented growth in the Illinois region and reflects the company’s ongoing investment in building strong, connected teams across the country.

“Our teams in Illinois have consistently set a high bar,” said Jeremy Hammond, CEO at Aveyo. “They continue to outpace themselves, performing above and beyond their goals. We felt like it was only a matter of time before they needed their own, Aveyo hub .”

The new office will serve as a regional hub for Aveyo’s Illinois-based employees, offering a culturally-driven space for collaboration, onboarding, and ongoing training. It also strengthens the company’s ties between its rapidly growing Midwest operations and its Utah headquarters, reinforcing Aveyo’s commitment to cultivating a unified company culture as it scales.

This expansion in Illinois serves as a mile marker and vision expander for the Aveyo team. “We’ve only been in full operation, as a company, for a little less than two years,” said Dave Anderson’s, Aveyo’s CFO. “But, we’re already starting to see our growth potential. We want Illinois to serve as a blueprint and gold standard for the new communities, regions, and states we service.” This latest expansion is part of a broader national strategy to meet rising demand for clean energy and provide localized support in key markets.

As more homeowners across the country look to take control of their energy costs and reduce their environmental footprint, Aveyo is expanding to meet that need. The Springfield office is now open and fully operational, marking a significant milestone for Aveyo as it continues its mission to make solar more accessible, more affordable, and more impactful for communities nationwide.$n5body$,
    $n5seo_title$We Opened a New Office in Illinois | Aveyo News$n5seo_title$,
    $n5seo_description$In order to better serve our quickly growing Illinois market, we opened a hub of operations for our various, IL-based teams.$n5seo_description$,
    TIMESTAMPTZ '2025-06-04T23:10:02+00:00',
    TIMESTAMPTZ '2025-06-04T23:10:02+00:00',
    TIMESTAMPTZ '2025-06-04T23:10:02+00:00'
  ),
  (
    $n6title$Rapid Growth Requires a High-Quality COO$n6title$,
    $n6slug$rapid-growth-requires-a-high-quality-coo$n6slug$,
    $n6category$Leadership$n6category$,
    $n6excerpt$We are pleased to announce Grant Miser as Aveyo’s Chief Operating Officer.$n6excerpt$,
    $n6hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/691cacb05605ae1e97eb0b5d_WELCOME%20COO%20GRANT%20land.jpg$n6hero$,
    $n6body$We know you’ve heard this sentence before, but Aveyo continues to grow. And, as we grow, we find that we need certain roles filled in order to support and refine our business to keep it on its current upward trajectory. Our most immediate need was to find a Chief Operating Officer. Luckily, we have talent pool of experienced individuals in-house, so we didn’t need to look very far.

We are pleased to announce Grant Miser as Aveyo’s Chief Operating Officer.

Grant Miser’s career has been as successful as it’s been diverse. His experience spans across many markets and disciplines, including solar, telecommunications, and emerging tech. He’s a seasoned leader in the direct-to-consumer and door-to-door sales industry, bringing more than 17 years of high-level knowledge that focuses on driving growth, building elite teams, and pioneering systems that can scale. Throughout these nearly two decades, he’s created a reputation of developing people just as intentionally as he develops companies.

Over the past four years, Grant has played a pivotal role in the solar sector as he’s led the creation of training systems, elevated sales standards, and helped Aveyo expand its footprint through strong leadership and culture development. While his immediate focus has been Aveyo’s sales channel, he is no stranger to managing high-level operations. In fact, he previously held the role of COO for both Caliber Solar and Satton Satellite.

Grant is a certified John Maxwell Coach and BYU graduate with a bachelor’s degree in accounting. It is that curious combination that gives him the rare ability to simplify complex concepts, inspire teams, and build systems that create consistent success at scale.

Driven, strategic, and deeply committed to empowering others, Grant continues to shape the future of organizations through disciplined leadership, world-class training, and a passion for developing high-impact professionals.

We couldn’t be more excited to see what he’ll do as COO and how his experience will shape Aveyo’s future.$n6body$,
    $n6seo_title$Rapid Growth Requires a High-Quality COO | Aveyo News$n6seo_title$,
    $n6seo_description$We are pleased to announce Grant Miser as Aveyo’s Chief Operating Officer.$n6seo_description$,
    TIMESTAMPTZ '2025-11-19T22:21:07+00:00',
    TIMESTAMPTZ '2025-11-18T17:28:23+00:00',
    TIMESTAMPTZ '2025-11-18T17:29:12+00:00'
  ),
  (
    $n7title$How Much Can Solar Save Me?$n7title$,
    $n7slug$solar-savings$n7slug$,
    $n7category$Education$n7category$,
    $n7excerpt$A transparent look at how much solar could really save you.$n7excerpt$,
    $n7hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/685984a3d0da22f8a0e0be52_Screenshot%202025-06-23%20at%2010.45.19%E2%80%AFAM.png$n7hero$,
    $n7body$Many people have two, burning questions about solar:

First: Can it actually save me money?

Second: If it can save me money, how much could it save me?

In this blog post, we’ll dive into these answers and give you a rough expectation of what you might expect if you choose to go solar.

Q1: CAN SOLAR ACTUALLY SAVE ME MONEY?

The simple answer is “yes.” Solar has saved thousands of people meaningful money over the months and years they’ve had solar on their roofs.

Here’s how it it generally works:

You pay a certain amount of money to your utility company every month to power your home. These utility companies create your power by burning fossil fuels like coal to superheat water, which produces steam to spin turbines, creating electricity. This, as you can imagine, is not an incredibly efficient, or sustainable way to create energy, which is why we’ve seen a consistent rise in energy prices year over year.

Solar is different. It’s not only a more efficient way to create electricity (the photovoltaics within each solar panel convert sunlight into potential energy), it’s also more sustainable. The energy you produce runs through a net metering system, and is sent back to the grid. You only pay your monthly system fee.

While the initial cost of a solar system may seem steep, at Aveyo, we ensure that your monthly payments are less than your average monthly energy bill. The discrepancy between your new monthly bill and your old energy bill can fluctuate depending on where you live, but we see meaningful savings more often than not.

Once your solar loan has been paid off, you simply pay the monthly connection fee (which is normally about $6) your utility company requires. This means you’ve not only freed yourself from a monthly energy bill, but the price hikes that invariably come along with it.

Q2: HOW MUCH COULD GOING SOLAR ACTUALLY SAVE ME?

The not-so-simple answer to this question is: “it depends.”

Your solar savings can vary widely depending on several key factors, including where you live, how much electricity your home uses, and the cost of your solar system. By understanding the variables that impact your savings, you can get a much clearer picture of what to expect.

One of the biggest influences on solar savings is location. Electricity rates can vary widely from state to state. In areas where utility rates are high (like Hawaii, New Hampshire, Connecticut, Florida, and California), solar quickly becomes a compelling, money saving alternative. Add in local incentives, tax credits, or rebates, and your potential savings can grow even further.

Another major consideration is how much electricity you use. Homes that consume more energy, whether from air conditioning, electric vehicles, pools and hottubs, or home offices, have more to gain from going solar, since offsetting a larger electricity bill typically leads to bigger savings. Even households with moderate usage can still benefit, especially over the long term, but the scale of those savings may be smaller.

The cost of your solar system also plays a huge role. Today, the average home solar installation ranges from $15,000 to $25,000 before incentives. That might sound steep, but federal tax credits and state-specific programs can shave off a sizable portion of that price. How you pay for your system also affects your bottom line. Buying it outright usually offers the greatest return on investment, while solar loans can spread the cost over time. Leasing options require less upfront money, but they also limit your total savings since you're not the system’s owner.

It’s also worth thinking about the long-term financial landscape. Utility rates generally rise over time, which means the more electricity costs go up, the more money you save by avoiding those bills. And if your local utility offers a net metering that gives you credit for sending excess solar energy back to the grid, your savings can increase even more.

To put this all into perspective, consider a homeowner in Southern California who installs a $20,000 solar system that offsets 100% of their electricity use. After incentives, their out-of-pocket cost might be around $14,000. Over 25 years, that system could deliver $30,000 to $50,000 in total savings, depending on how energy prices fluctuate.

The bottom line? Solar can absolutely save you money. In some cases, a lot of it. But the exact amount depends on your location, your energy habits, and the choices you make about system size and financing. The best way to get an accurate estimate is to speak with a local solar provider or use Aveyo’s savings calculator to get an idea of what going solar could do for you.

[https://aveyo.com/locations](https://aveyo.com/locations)$n7body$,
    $n7seo_title$How Much Can Solar Save Me? | Aveyo News$n7seo_title$,
    $n7seo_description$A transparent look at how much solar could really save you.$n7seo_description$,
    TIMESTAMPTZ '2025-06-23T16:46:27+00:00',
    TIMESTAMPTZ '2025-06-23T16:46:27+00:00',
    TIMESTAMPTZ '2025-06-23T16:46:27+00:00'
  ),
  (
    $n8title$The Big Beautiful Bill$n8title$,
    $n8slug$the-big-beautiful-bill$n8slug$,
    $n8category$Policy$n8category$,
    $n8excerpt$Big Changes Ahead: What the “One Big Beautiful Bill” Means for Homeowners Going Solar$n8excerpt$,
    $n8hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/688cf704ce70060f12128c1b_Screenshot%202025-08-01%20at%2011.18.29%E2%80%AFAM.png$n8hero$,
    $n8body$[Watch video](https://youtu.be/bxzR7rmzF7c)

If you’ve been thinking about installing solar panels or a home battery, the clock is ticking.

On July 4th, President Trump signed the “One Big Beautiful Bill” (OBBB), which means major, upcoming changes to clean energy tax credits. Especially for homeowners. If you want to take full advantage of the current incentives, you’ll need to act fast.

Here’s what it means for you — and how Aveyo has you covered.

## The 30% Solar Tax Credit Is Ending

Right now, homeowners can claim 30% of the cost of a solar or battery system as a federal tax credit. It’s one of the best clean energy incentives available, but with the passing of the Big Beautiful Bill, it won’t be around much longer.

This credit, officially called the 25D Residential Clean Energy Credit, is going away after December 31, 2025.

In order to qualify, and take advantage of this Energy Credit, your solar or battery system must be fully installed and operational before that deadline. Signing a contract isn’t enough — permitting and installation delays could put your credit at risk.

Aveyo Tip: If you’re serious about going solar, don’t wait. Our team will guide you through every step — design, financing, permitting, and installation — to make sure you lock in that tax credit before it disappears.

## What About Batteries?

Good news: home battery systems qualify for the same 30% tax credit, even if they’re installed separately from your solar system. But, the same deadline applies: you’ll need to install your battery by the end of 2025 to claim it.

Not sure whether to add storage now or later? Aveyo will walk you through the options and help you design a system that fits your needs and your budget.

## Leased Solar Still Qualifies

If you’re using a lease or power purchase agreement (PPA), you’re still eligible for the tax credit. Nothing changes under the new law and Aveyo can help you explore all ownership and financing options.

## New Rules Could Affect Solar Pricing

The new bill also includes rules to encourage more U.S.-made solar products. That’s good news long term, but could cause short-term price swings or product availability issues while manufacturers adjust.

That’s why it pays to act now. Aveyo is already working with trusted partners to secure supply and keep your project moving.

## Additionally, Utility Rates May Be Headed Up

One important side effect of the new law to keep in mind: electric utility rates are likely to rise.

As the OBBB limits clean energy deployment and adds restrictions on materials and manufacturing, utilities may lean more heavily on traditional, more expensive energy sources — and those costs often get passed along to consumers.

In other words, the longer you wait to go solar, the more you could pay, both in lost tax credits and rising energy bills.

By going solar with Aveyo, you take control of your energy costs now and protect yourself from future rate hikes.

## The Bottom Line

If you’re thinking about solar or batteries for your home, now’s the time to move.

To claim the 30% federal tax credit, your system must be installed before December 31, 2025. That deadline won’t be extended and delays could end costing you thousands.

## Aveyo Has You Covered

We know going solar can feel overwhelming — but it doesn’t have to be. With Aveyo, you get one trusted team to handle everything:

- Custom system design
- Transparent pricing
- Smart financing
- Full-service installation
- Expert guidance on all incentives

Have questions? We’ve got answers. Talk to Aveyo today — we’ll help you go solar with confidence and make sure you don’t leave money on the table.$n8body$,
    $n8seo_title$The Big Beautiful Bill | Aveyo News$n8seo_title$,
    $n8seo_description$Big Changes Ahead: What the “One Big Beautiful Bill” Means for Homeowners Going Solar$n8seo_description$,
    TIMESTAMPTZ '2025-08-06T21:43:16+00:00',
    TIMESTAMPTZ '2025-08-01T17:03:23+00:00',
    TIMESTAMPTZ '2025-08-01T17:23:40+00:00'
  ),
  (
    $n9title$THE MERGER$n9title$,
    $n9slug$the-merger-2$n9slug$,
    $n9category$Company$n9category$,
    $n9excerpt$This may just be the most important merger the solar world has ever seen.$n9excerpt$,
    $n9hero$https://cdn.prod.website-files.com/64d50226cda645d47db48311/65a95f932ed52ec96180f576_blog-image-min%20(1).png$n9hero$,
    $n9body$Early 2023, 10 solar companies—Axis, Primo, Vantage Solar, LinkUs, Gen, TwoTwelve, Off Grid Energy, Caliber Solar, Blue Sky Energy Solutions, GR8FL Solar, Flex PWR, AP Pros, and Solfinity—merged together. Each with their individual strengths, possibilities, and assets. The leaders of these 10 solar companies saw a chance to do something bigger than themselves. To create a better name in the world of solar, all while providing consumers and reps with a much better experience.

Aveyo was created along with a new brand, a new look, and new capabilities that will elevate and change the solar industry forever. This is a small part of our story.

The Beginning

The Aveyo story begins where the the solar world broke away from its good intentions and grand potential.

Our industry leaders took action, putting their heads, companies, and reputations together to bring solar back into the light. Aveyo was born, complete with an elevated vision, powerful partners, consumer-centric processes, and a singular commitment to the most critical, yet missing, piece of the entire solar process – transparency. Aveyo is the solar company built to better the world simply by being what’s clearly best for its customers.

Transparency stands at the center of everything we do, informs how we operate, and powers how we grow:

Transparency of process.

Transparency of power.

Transparency of price.

Transparency of purpose.

Transparency of pay.

Transparency of potential.

Our name leans into this ethos.

A New Brand

Aveyo

a·vey·o | noun | derived from “te veo,” meaning I see you.

we see our consumers and our employees—their needs and what is best for them. We see what solar should be (and what we’ll make it). We see the path forward to changing our customers’ futures by showing them now.

transparency · light · clarity

Clean. Clear. Candid.

We built our brand on this foundation of transparency. Our vision and our mission not only mirror, but support that focus. We hope to create a solar brand that provides better experiences, accelerates that world’s adoption of renewable energy, and elevates they way that individuals power their lives.

Our consumer visual identity is clean, clear, and confident. Our rep-facing look is cool, current, and captivating. On both sides of our brand, we put our end user at the center, in complete control, and in the know.

New Capabilities

Because of this merge, we were able to create a company with top-to-bottom energy services. This means that we handle the sale, the CAD, the install, the activation, and everything in between. Additionally, we’ve leveraged powerful technologies and integrations that make the solar experience easier, cleaner, and quicker. These technologies also provide full transparency and education for our consumers, giving them peace of mind through constant updates and real-time monitoring.

Our entire service stack allows us to provide solar as it should be.

A New Vision

We, at Aveyo, not only wanted to change the way that solar was done, but the way it’s perceived by the public. We understand that solar isn’t always viewed favorably. But, as we stick to our ethos and continue to provide expectation-exceeding service, we can be part of a movement that puts solar in a better light—where it should have always stayed.$n9body$,
    $n9seo_title$THE MERGER | Aveyo News$n9seo_title$,
    $n9seo_description$This may just be the most important merger the solar world has ever seen.$n9seo_description$,
    TIMESTAMPTZ '2025-04-04T22:10:26+00:00',
    TIMESTAMPTZ '2024-01-16T20:50:00+00:00',
    TIMESTAMPTZ '2025-02-24T22:16:40+00:00'
  ),
  (
    $n10title$The Problem with the monopoly of energy companies$n10title$,
    $n10slug$the-problem-with-the-monopoly-of-energy-companies$n10slug$,
    $n10category$Education$n10category$,
    $n10excerpt$We’re used to having choices. Lots of choices.$n10excerpt$,
    $n10hero$https://uploads-ssl.webflow.com/64d50226cda645d47db48311/662a6df7bdb19d1f0309e58d_blogpost-04-min.png$n10hero$,
    $n10body$We’re used to having choices. Lots of choices.

You can choose your internet, cable, and phone provider. Then, once you’re satisfied with your provider, you can choose from a plethora of computer, television, and phone brands that fit your budget and suite your preferences. Head to the grocery store and you’ll find over 150 brands of cereal, more than 200 different types of sodas and drinks, over 300 different types of candies, chocolates, and sweets, and around 50,000 products, packing the shelves of the aisles you walk down.

We have, and have always had, a freedom to choose.

While there are certain drawbacks of having so many choices, there are also undeniable benefits that we enjoy as consumers within this competitive, free market:

-Brands must create quality products in order to stand out in their specific market.

-Brands must also prioritize and push for innovation in order to gain an edge or advantage over their competition.

-Pricing must be competitive and fair

-Efficiency of process, production, and delivery is required so brands can continue cash flowing

-New brands and entrepreneurs can enter the market with paradigm-shifting ideas or products, which pushes progress and quality forward

-Free markets encourage diversity and specialization, allowing businesses to cater to niche markets and specific consumer preferences.

This diversity of offerings ensures that consumers with varied tastes, preferences, and budgets can find products and services that meet their needs.

Many of the luxuries we enjoy today can be attributed to our market’s approach.

However, there is one question that begs to be asked: with all of the progress and freedom our free market has created, why can’t we choose our electrical company yet?

Power has been monopolized. Most individuals only have one power provider to choose from and that’s it. There are a handful of states that give you the option between two power companies, but those are the exception rather than the rule.

There are some major, glaring problems with this monopolistic approach, and we want to discuss them here, and maybe give a glimpse of hope into a future where innovation and invention changes the power landscape.

PROBLEM 1 - LACK OF COMPETITION MEANS ARBITRARY PRICING (AND PRICE INCREASE)

Over the last few decades, power prices have only gone up. Most homeowners experience an 8% hike in power prices year to year.

Monopolies have the power to dictate price without fear of competitors undercutting them. In the energy sector especially, this can result in artificially inflated prices and more expensive energy over the longterm.

PROBLEM 2 - MONOPOLIES AND INNOVATION NEVER MIX

Without competition, monopolies have little incentive to innovate or improve the quality of their services or the efficiency of their power creation.

This can also lead to outdated infrastructure, technology, and ineffective processes. This small problem often leads to bigger issues:

-Environmental impact is often negative and broad because cleaner methods have not been engineered or “needed”

-Inefficiencies can lead to slimmer margins, causing price hikes and inflation.

PROBLEM 3 - POLITICAL INFLUENCE

Energy monopolies often wield significant political influence. This can undermine regulatory oversight and lead to policies that favor the interests of the monopoly over those of consumers or the environment. As a result, regulatory agencies may be less inclined to enforce antitrust laws or implement measures to promote competition and consumer welfare

SO, WHAT’S THE FIX?

One, long-term fix would have to come from the private sector. An innovation-focused company that creates a more efficient means of creating and distributing power. Though this disruption seems like more of a long shot with more barriers of entry and more pushback by agencies and departments, it would fix our monopoly problem.

And this brings us to the central point of our article: the importance of solar. While solar isn’t the only fix, it certainly is the most simple, practical, and functional. Putting solar on your roof allows you to “break up” with your energy provider, while simultaneously giving you the power to flatline your power bill, choose another source of energy creation, and subscribe to another energies company.

Solar, as its adoption and acceptance grows, becomes the David to stand up to the energy-monopoly Goliath. As more individuals opt to go solar, these energy providers begin feeling a pressure to change their approach, make their energy production more efficient, and be more careful with price adjustments and hikes.$n10body$,
    $n10seo_title$The Problem with the monopoly of energy companies | Aveyo News$n10seo_title$,
    $n10seo_description$We’re used to having choices. Lots of choices.$n10seo_description$,
    TIMESTAMPTZ '2024-11-21T02:25:37+00:00',
    TIMESTAMPTZ '2024-04-24T22:13:33+00:00',
    TIMESTAMPTZ '2024-04-25T14:51:48+00:00'
  );
