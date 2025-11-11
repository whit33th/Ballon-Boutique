"use client";

export default function DeliveryPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50">
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-xl bg-white shadow-lg">
            {/* Header */}
            <div className="border-b border-gray-200 bg-linear-to-r from-purple-600 to-blue-600 p-8">
              <h1 className="text-3xl font-bold text-white">
                Delivery & Pickup
              </h1>
            </div>

            <div className="p-8">
              {/* Pickup Section */}
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-bold text-gray-800">
                  🏪 Self-pickup
                </h2>
                <div className="rounded-lg bg-purple-50 p-6">
                  <p className="mb-4 text-gray-700">
                    Your Ballon Boutique order can be conveniently picked up:
                  </p>
                  <div className="space-y-3 text-gray-700">
                    <div className="flex items-start">
                      <span className="mr-3 font-semibold">📍 Address:</span>
                      <span>Sandgasse 3, 8720 Knittelfeld</span>
                    </div>
                    <div className="flex items-start">
                      <span className="mr-3 font-semibold">
                        🕐 Opening hours:
                      </span>
                      <span>
                        7 days a week, 24 hours a day, no breaks or holidays
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="mr-3 font-semibold">⏰ Important:</span>
                      <span>
                        Please confirm the date and time of pickup in advance
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="mr-3 font-semibold">💰 Payment:</span>
                      <span>
                        Cash only on-site (when choosing cash payment)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Section */}
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-bold text-gray-800">
                  🚗 Delivery
                </h2>
                <div className="rounded-lg bg-green-50 p-6">
                  <p className="mb-4 text-gray-700">
                    Delivery to nearby cities is available for an additional fee
                    from 16:00 to 21:00
                  </p>
                  <div className="space-y-3 text-gray-700">
                    <div className="flex items-start">
                      <span className="mr-3 font-semibold">💶 Cost:</span>
                      <span>+€16 to order total</span>
                    </div>
                    <div className="flex items-start">
                      <span className="mr-3 font-semibold">
                        🕐 Delivery time:
                      </span>
                      <span>From 16:00 to 21:00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-bold text-gray-800">
                  📋 Additional Information
                </h2>
                <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>
                        <strong>Reservation and cancellation:</strong> Order is
                        confirmed after payment or WhatsApp confirmation.
                        Cancellation possible up to 48 hours before pickup
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">⏱️</span>
                      <span>
                        <strong>Preparation time:</strong> 72 hours (3 days)
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">📱</span>
                      <span>
                        <strong>Contact:</strong> WhatsApp only
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Contact Section */}
              <div className="text-center">
                <h2 className="mb-4 text-2xl font-bold text-gray-800">
                  Contact Us
                </h2>
                <p className="mb-4 text-gray-600">
                  For all inquiries, please contact us via WhatsApp
                </p>
                <a
                  href="https://wa.me/YOUR_WHATSAPP_NUMBER"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-green-600 px-8 py-4 font-semibold text-white transition-colors hover:bg-green-700"
                >
                  <span className="mr-2 text-2xl">📱</span>
                  Contact via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
