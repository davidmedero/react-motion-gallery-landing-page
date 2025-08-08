'use client';

export default function Pricing() {

  return (
    <section
      id="pricing"
      className="py-16 text-[rgba(0,0,0,0.8)] bg-[#fff] flex justify-center lg:px-8 sm:px-6 px-4"
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
            <p className="text-sm text-[rgba(0,0,0,0.8)] mb-6">One-time payment</p>
            <ul className="list-disc list-outside space-y-2 text-[rgba(0,0,0,0.8)] pl-4">
              <li>Includes all current and future components</li>
              <li>Lifetime Access to Github Repo</li>
              <li>Commercial License</li>
              <li>Basic Support via Github Issues</li>
            </ul>
          </div>
          
          <button
            onClick={() => {/* handle purchase or link */}}
            className="mt-6 w-full bg-blue-400 hover:bg-blue-500 text-white py-2 rounded font-[600] transition-colors duration-200 ease-in-out cursor-pointer"
          >
            Get Starter
          </button>
        </div>

        {/* $200 Pro Plan */}
        <div className={"p-6 text-left flex flex-col justify-between glass"}>
        <div>
          <h2 className="text-2xl font-bold mb-4">Pro</h2>
          <p className="text-4xl font-extrabold mb-3">
              $200
              <span className="text-lg font-bold align-top ml-2 text-pink-400">/ Life</span>
            </p>
            <p className="text-sm text-[rgba(0,0,0,0.8)] mb-6">One-time payment</p>
          <ul className="list-disc list-outside space-y-2 text-[rgba(0,0,0,0.8)] pl-4">
            <li>Everything in Starter</li>
            <li>24/7 Priority Support</li>
            <li>Custom Integrations for your site</li>
            <li>Custom React component tailored precisely to your requirements</li>
          </ul>
        </div>
          
          <button
            onClick={() => {/* handle purchase or link */}}
            className="mt-6 w-full bg-pink-400 hover:bg-pink-500 text-white py-2 rounded font-[600] transition-colors duration-200 ease-in-out cursor-pointer"
          >
            Get Pro
          </button>
        </div>
      </div>
    </section>
  )
}