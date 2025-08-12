'use client';

export default function Pricing() {

  function ThreeDButton({
    variant = "blue",
    children,
    onClick,
  }: {
    variant?: "blue" | "pink";
    children: React.ReactNode;
    onClick?: () => void;
  }) {
    const v =
      variant === "pink"
        ? {
            base: "bg-pink-500",
            face: "bg-pink-400 group-hover:bg-pink-500 focus-visible:ring-pink-400",
          }
        : {
            base: "bg-blue-500",
            face: "bg-blue-400 group-hover:bg-blue-500 focus-visible:ring-blue-400",
          };

    return (
      <button
        onClick={onClick}
        className="relative group w-full cursor-pointer select-none mt-6"
        type="button"
        aria-label={typeof children === "string" ? children : undefined}
      >
        {/* Base (stays put, becomes visible when face moves) */}
        <span
          className={`absolute inset-0 rounded-lg ${v.base}`}
          aria-hidden
        />
        {/* Face (moves up/left on hover) */}
        <span
          className={`relative block w-full rounded-lg py-2 text-white font-semibold ${v.face}
            transition-all duration-200 ease-out
            motion-safe:group-hover:-translate-x-1.5 motion-safe:group-hover:-translate-y-1.5
            motion-safe:group-hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)]
            group-active:translate-x-0 group-active:translate-y-0 group-active:shadow-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
        >
          {children}
        </span>
      </button>
    );
  }


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
            <p className="text-sm text-[rgba(0,0,0,0.8)] mb-6">One-time payment</p>
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