import { SEO } from "@/components/SEO";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <>
      <SEO
        title="Contact Us - Get in Touch"
        description="Contact Nibbles Kitchen for orders, inquiries, or feedback. Find our location, phone number, email, and business hours. We're here to serve you authentic Nigerian cuisine."
        keywords="contact Nibbles Kitchen, restaurant contact, Nigerian restaurant location, food ordering contact, customer service, restaurant hours"
        ogUrl="https://nibblesfastfood.com/contact"
        canonicalUrl="https://nibblesfastfood.com/contact"
      />

      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        {/* Hero Section */}
        <div className="bg-[#50BAA8] text-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl md:text-2xl opacity-90">
              We'd love to hear from you
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Get in Touch</h2>
              <p className="text-lg text-gray-700 mb-8">
                Have questions or feedback? We're here to help! Reach out to us through
                any of the following channels.
              </p>

              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="bg-[#50BAA8]/10 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-[#50BAA8]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Phone</h3>
                    <a
                      href="tel:+1234567890"
                      className="text-gray-600 hover:text-[#50BAA8] transition-colors"
                    >
                      +1 (234) 567-890
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="bg-[#50BAA8]/10 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-[#50BAA8]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                    <a
                      href="mailto:hello@nibbleskitchen.com"
                      className="text-gray-600 hover:text-[#50BAA8] transition-colors"
                    >
                      hello@nibbleskitchen.com
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="bg-[#50BAA8]/10 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-[#50BAA8]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Location</h3>
                    <p className="text-gray-600">
                      123 Food Street<br />
                      City, State 12345<br />
                      United States
                    </p>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="flex items-start gap-4">
                  <div className="bg-[#50BAA8]/10 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-[#50BAA8]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Business Hours</h3>
                    <div className="text-gray-600 space-y-1">
                      <p>Monday - Friday: 11:00 AM - 9:00 PM</p>
                      <p>Saturday: 12:00 PM - 10:00 PM</p>
                      <p>Sunday: 12:00 PM - 8:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Send us a Message</h2>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#50BAA8] focus:border-transparent outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#50BAA8] focus:border-transparent outline-none transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#50BAA8] focus:border-transparent outline-none transition-all"
                    placeholder="+1 (234) 567-890"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#50BAA8] focus:border-transparent outline-none transition-all resize-none"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#50BAA8] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#50BAA8]/90 transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-[#50BAA8]/10 p-8 rounded-lg border border-[#50BAA8]/20 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Ready to Order?
            </h2>
            <p className="text-gray-700 mb-6">
              Browse our menu and place your order online for quick pickup
            </p>
            <a
              href="/"
              className="inline-block bg-[#50BAA8] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#50BAA8]/90 transition-colors"
            >
              View Menu & Order
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
