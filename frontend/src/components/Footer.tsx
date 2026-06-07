import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-black text-white mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-1 mb-4">
              <span className="text-xl font-extrabold text-orange">Clean</span>
              <span className="text-xl font-extrabold text-white">NG</span>
            </div>
            <p className="text-sm text-grey-light leading-relaxed">
              Nigeria's most trusted cleaning marketplace. Connecting homes with verified professionals.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">For customers</h4>
            <ul className="space-y-2">
              {[["Find cleaners", "/search"], ["How it works", "/how-it-works"], ["Safety", "/safety"]].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-grey-light hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">For cleaners</h4>
            <ul className="space-y-2">
              {[["Become a cleaner", "/register?role=cleaner"], ["Cleaner resources", "/cleaner-resources"], ["Payouts", "/cleaner/payouts"]].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-grey-light hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              {[["About", "/about"], ["Blog", "/blog"], ["Contact", "/contact"], ["Privacy policy", "/privacy"]].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-grey-light hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-caption text-grey-light">© {new Date().getFullYear()} CleanNG. All rights reserved.</p>
          <p className="text-caption text-grey-light">Made with care in Lagos, Nigeria 🇳🇬</p>
        </div>
      </div>
    </footer>
  );
}
