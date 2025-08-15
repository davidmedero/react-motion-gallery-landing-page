'use client';

export default function Pricing() {

  return (
    <section
      id="pricing"
      className="scroll-mt-8 py-16 text-[rgba(0,0,0,0.8)] bg-[#fff] flex justify-center lg:px-8 sm:px-6 px-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* $25 Plan */}
        <div className={"p-6 text-left flex flex-col justify-between glass"}>
          <div>
            <h2 className="text-2xl font-bold mb-4">Starter</h2>
            <p className="text-4xl font-extrabold mb-3">
              $25
              <span className="text-lg font-bold align-top ml-2 text-blue-400">/ Life</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">One-time payment</p>
            <ul className="list-disc list-outside space-y-2 text-[rgba(0,0,0,0.8)] pl-4">
              <li>Includes all current and future components</li>
              <li>Lifetime Access to Github Repo</li>
              <li>Commercial License</li>
              <li>Basic Support via Github Issues</li>
            </ul>
          </div>

          <a className="starter__cta">
            <button className="starter__cta_pushable">
              <span className="starter__cta_front">
                Get Starter
                <span>
                </span>
              </span>
            </button>
          </a>
        </div>

        {/* $200 Pro Plan */}
        <div className={"p-6 text-left flex flex-col justify-between glass"}>
        <div>
          <h2 className="text-2xl font-bold mb-4">Pro</h2>
          <p className="text-4xl font-extrabold mb-3">
              $200
              <span className="text-lg font-bold align-top ml-2 text-pink-400">/ Life</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">One-time payment</p>
          <ul className="list-disc list-outside space-y-2 text-[rgba(0,0,0,0.8)] pl-4">
            <li>Everything in Starter</li>
            <li>24/7 Priority Support</li>
            <li>Custom Integrations for your site</li>
            <li>Custom React component tailored precisely to your requirements</li>
          </ul>
        </div>
          
          <a className="pro__cta">
            <button className="pro__cta_pushable">
              <span className="pro__cta_front">
                Get Pro
                <span>
                </span>
              </span>
            </button>
          </a>
        </div>
      </div>
    </section>
  )
}