import Image from "next/image";

export default function CompanyStory() {
  return (
    <section id="about" className="bg-white px-5 pt-[160px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-10 text-center lg:gap-[40px]">
        {/* <Image
          src="/images/7b3c23dc58ec0367933baccd515501d3d0ca2f67.png"
          alt="Aveyo symbol"
          width={306}
          height={239}
          className="h-auto w-[180px] sm:w-[240px] lg:w-[306px]"
          priority
        /> */}

        <div className="flex flex-col items-center gap-4 lg:gap-[30px]">
          <h2 className="text-[44px] leading-[1.02] tracking-[-0.01em] text-[#212120] sm:text-[56px] lg:w-[646px] lg:text-[70px]">
            Bringing The Energy
            <br />
            Since 2023
          </h2>
          <p className="text-lg leading-[1.4] text-[#212120] sm:text-xl lg:text-2xl">
            Redefining What Home Solar Should Feel Like
          </p>
        </div>

        <p className="w-full max-w-[700px] text-center text-sm leading-[1.7] text-black sm:text-[15px] lg:text-base">
          We built Aveyo specifically for you. To give you meaningful savings,
          better service, and a hassle-free experience the entire way through. We
          understand all too well why solar has a bad name, which is why
          everything we do is focused on providing you with the best service
          possible.
        </p>

        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-[10px] bg-gradient-to-b from-[#f4faff] to-[#d8d8d8] px-6 py-10 text-center sm:px-8 lg:px-10 lg:py-[60px]">
            <p className="text-lg leading-[1.5] text-[#7d8081] lg:text-2xl">
              An Industry-Exclusive
            </p>
            <div className="my-6 text-[#212120]">
              <p className="text-[38px] leading-none sm:text-[44px] lg:text-[52px]">
                Stress-Free
              </p>
              <p className="text-[38px] leading-none sm:text-[44px] lg:text-[52px]">
                Guarantee
              </p>
            </div>
            <p className="text-lg leading-[1.5] text-[#7d8081] lg:text-2xl">
              On Every System We Install
            </p>
          </div>

          <div className="rounded-[10px] bg-gradient-to-b from-[#f4faff] to-[#d8d8d8] px-6 py-10 text-center sm:px-8 lg:px-10 lg:py-[60px]">
            <p className="text-lg leading-[1.5] text-[#7d8081] lg:text-2xl">
              We&apos;re Always
            </p>
            <div className="my-6 text-[#212120]">
              <p className="text-[38px] leading-none sm:text-[44px] lg:text-[52px]">
                100%
              </p>
              <p className="text-[38px] leading-none sm:text-[44px] lg:text-[52px]">
                Transparent
              </p>
            </div>
            <p className="text-lg leading-[1.5] text-[#7d8081] lg:text-2xl">
              Through The Entire Process
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

