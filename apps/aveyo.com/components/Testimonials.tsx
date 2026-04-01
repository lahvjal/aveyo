import Image from "next/image";

export default function Testimonials() {
  const testimonials = [
    {
      image: "/images/testimonial-1.jpg",
      name: "Sarah Johnson",
      location: "Austin, TX",
      rating: 5,
      quote: "The Aveyo team made going solar incredibly easy. From the initial consultation to the final installation, everything was seamless. Our energy bills have dropped by 70%!",
    },
    {
      image: "/images/testimonial-2.jpg",
      name: "Michael Chen",
      location: "Phoenix, AZ",
      rating: 5,
      quote: "I was skeptical at first, but Aveyo's transparency won me over. No hidden fees, exactly what they promised. Best home investment I've ever made.",
    },
    {
      image: "/images/testimonial-3.jpg",
      name: "Emily Rodriguez",
      location: "San Diego, CA",
      rating: 5,
      quote: "Outstanding service from start to finish. The installation crew was professional and clean. It's been 6 months and my panels are performing above expectations.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl sm:text-5xl text-brand-navy mb-4">
            Testimonials
          </h2>
          <p className="text-brand-gray">
            See what our customers have to say about us
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-brand-cream rounded-3xl p-8"
            >
              {/* Avatar & Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-brand-navy to-brand-gold">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                  {/* Placeholder initials when no image */}
                  <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-lg">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-brand-navy">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-brand-gray">{testimonial.location}</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-brand-gold"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-brand-gray leading-relaxed">
                &quot;{testimonial.quote}&quot;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

