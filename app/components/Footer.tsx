export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-yellow-400/30 bg-black py-10 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div>
          {/* About / Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
              Contact Us
            </h3>
            <p className="mt-2 text-sm text-white/90">
              We are an Ecosport Owner&apos;s Club in Trivandrum with regular
              activities and a passion for exploring avenues.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-white/80">
              <li>
                <a
                  href="tel:+917002687376"
                  className="hover:text-yellow-400"
                >
                  Phone: +91 7002687376
                </a>
              </li>
              <li>
                <a
                  href="mailto:ecostvm@gmail.com"
                  className="hover:text-yellow-400"
                >
                  ecostvm@gmail.com
                </a>
              </li>
              <li className="text-white/80">
                The Oval, FCI Road, Thekkumukku, Menamkulam,
                <br />
                Kazhakkoottam P.O, Trivandrum
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/20 pt-6 sm:flex-row">
          <p className="text-xs text-white/70">
            © {new Date().getFullYear()} by ecostvm.com
          </p>
          <p className="text-xs text-white/70">
            Feedback portal powered by{" "}
            <span className="font-medium text-white/90">Touchpointe Digital</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
