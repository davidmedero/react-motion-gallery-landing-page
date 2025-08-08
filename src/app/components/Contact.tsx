export default function Contact() {
  return (
    <section id="contact" className="py-16 bg-[#fff] text-center px-8">
      <h2 className="text-3xl font-bold text-[#0A0A0A] mb-4">Got Questions?</h2>
      <p className="text-[#0A0A0A]/80 mb-8">
        Feel free to reach out with any questions, feedback, or concerns.
      </p>
      <a
        href="mailto:david.gregory.medero@gmail.com"
        className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition"
      >
        Email Me
      </a>
      <p className="mt-4 text-[#0A0A0A]/60 text-sm">
        Or find me on{" "}
        <a
          href="https://twitter.com/yourhandle"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          Twitter
        </a>
        .
      </p>
    </section>
  );
}