import { SEO } from "@/components/SEO";

export default function AboutPage() {
  return (
    <>
      <SEO
        title="About Us - Authentic Nigerian Cuisine"
        description="Learn about Nibbles Kitchen, your destination for authentic Nigerian food. We serve traditional dishes made with fresh ingredients and traditional recipes passed down through generations."
        keywords="about Nibbles Kitchen, Nigerian restaurant story, authentic African cuisine, Nigerian food culture, restaurant about us"
        ogUrl="https://nibblesfastfood.com/about"
        canonicalUrl="https://nibblesfastfood.com/about"
      />

      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        {/* Hero Section */}
        <div className="bg-[#50BAA8] text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About Nibbles Kitchen</h1>
            <p className="text-xl md:text-2xl opacity-90">
              Bringing the authentic taste of Nigeria to your table
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Our Story */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Story</h2>
            <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
              <p>
                Welcome to Nibbles Kitchen, where every dish tells a story of tradition,
                culture, and the vibrant flavors of Nigeria. Founded with a passion for
                authentic Nigerian cuisine, we bring you the taste of home-cooked meals
                made with love and the finest ingredients.
              </p>
              <p>
                Our journey began with a simple mission: to share the rich culinary heritage
                of Nigeria with food lovers everywhere. From our famous jollof rice to our
                perfectly seasoned suya, every recipe is crafted using traditional methods
                passed down through generations.
              </p>
            </div>
          </section>

          {/* What We Offer */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">What We Offer</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-[#50BAA8] mb-3">Authentic Recipes</h3>
                <p className="text-gray-700">
                  Traditional Nigerian dishes prepared with authentic spices and cooking
                  techniques that honor our culinary roots.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-[#50BAA8] mb-3">Fresh Ingredients</h3>
                <p className="text-gray-700">
                  We source the freshest ingredients daily to ensure every meal is of the
                  highest quality and bursting with flavor.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-[#50BAA8] mb-3">Fast Service</h3>
                <p className="text-gray-700">
                  Order online and enjoy quick pickup service. Your favorite dishes,
                  ready when you need them.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold text-[#50BAA8] mb-3">Made with Love</h3>
                <p className="text-gray-700">
                  Every dish is prepared with care and passion, bringing you the warmth
                  and comfort of a home-cooked meal.
                </p>
              </div>
            </div>
          </section>

          {/* Our Commitment */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Our Commitment</h2>
            <div className="bg-[#50BAA8]/10 p-8 rounded-lg border border-[#50BAA8]/20">
              <p className="text-lg text-gray-700 leading-relaxed">
                At Nibbles Kitchen, we're committed to providing you with an exceptional
                dining experience. Whether you're craving jollof rice, pounded yam with
                egusi soup, or perfectly grilled suya, we ensure every meal meets our high
                standards of quality and authenticity. Your satisfaction is our priority,
                and we're here to serve you the best of Nigerian cuisine.
              </p>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Ready to Experience Authentic Nigerian Cuisine?
            </h2>
            <a
              href="/"
              className="inline-block bg-[#50BAA8] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#50BAA8]/90 transition-colors"
            >
              Order Now
            </a>
          </section>
        </div>
      </div>
    </>
  );
}
