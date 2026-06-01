import { EditableSiteImage } from "@/components/site/editable-site-image";

export default function LifestyleGallery() {
  const images = [
    {
      src: "/images/gallery-1.jpg",
      alt: "Modern home with solar panels",
      placeholder: "from-brand-navy/20 to-brand-gold/20",
    },
    {
      src: "/images/gallery-2.jpg",
      alt: "Solar installation on roof",
      placeholder: "from-brand-cream to-gray-200",
    },
    {
      src: "/images/gallery-3.jpg",
      alt: "Family in backyard",
      placeholder: "from-gray-200 to-brand-cream",
    },
    {
      src: "/images/gallery-4.jpg",
      alt: "Solar panels close-up",
      placeholder: "from-brand-gold/20 to-brand-navy/20",
    },
    {
      src: "/images/gallery-5.jpg",
      alt: "Home exterior with panels",
      placeholder: "from-brand-cream to-gray-300",
    },
  ];

  return (
    <section className="bg-white">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative overflow-hidden group bg-gradient-to-br ${image.placeholder} ${
              index === 0
                ? "col-span-2 row-span-2 aspect-square"
                : index === 3
                ? "col-span-1 row-span-2 aspect-[1/2]"
                : "col-span-1 row-span-1 aspect-square"
            }`}
          >
            <EditableSiteImage
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes={index === 0 ? "50vw" : "25vw"}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}
      </div>
    </section>
  );
}

