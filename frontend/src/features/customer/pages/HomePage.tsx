import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import { formatNaira } from "@/lib/utils";
import { Star, Shield, Clock } from "lucide-react";

const SERVICES = [
  { icon: "🏠", label: "Regular cleaning", from: 4000 },
  { icon: "🧹", label: "Deep cleaning", from: 7500 },
  { icon: "🏢", label: "Office cleaning", from: 5500 },
  { icon: "🔨", label: "Post-construction", from: 10000 },
];

const TRUST_POINTS = [
  { icon: Shield, title: "Verified cleaners", desc: "Every cleaner passes ID and background checks before they can list." },
  { icon: Star, title: "Rated & reviewed", desc: "Real reviews from real customers after every completed job." },
  { icon: Clock, title: "Secure payments", desc: "Pay into escrow — funds release only after you confirm the job is done." },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="bg-white py-20 px-4 text-center">
        <p className="text-caption uppercase tracking-widest text-orange font-medium mb-4">
          Lagos-first cleaning marketplace
        </p>
        <h1 className="text-display text-black max-w-3xl mx-auto mb-6">
          Clean home, zero stress
        </h1>
        <p className="text-body text-grey-mid max-w-xl mx-auto mb-10">
          Book a verified cleaner in minutes. Pay securely. Only release funds when you're satisfied.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/search")}>
            Find a cleaner
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/register?role=cleaner")}>
            Become a cleaner
          </Button>
        </div>
      </section>

      {/* Services */}
      <section className="bg-bg-alt py-16 px-4">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-h2 text-center mb-10">What do you need cleaned?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICES.map((s) => (
              <button
                key={s.label}
                onClick={() => navigate(`/search?type=${s.label}`)}
                className="bg-white rounded-card border border-border p-6 text-left hover:border-orange hover:shadow-sm transition-all"
              >
                <span className="text-3xl mb-3 block">{s.icon}</span>
                <p className="text-sm font-semibold text-black mb-1">{s.label}</p>
                <p className="text-caption text-grey-light">From {formatNaira(s.from)}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-h2 text-center mb-10">Why CleanNG?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TRUST_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-light mb-4">
                  <Icon className="h-6 w-6 text-orange" />
                </div>
                <h3 className="text-h4 mb-2">{title}</h3>
                <p className="text-small text-grey-mid">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-16 px-4 text-center">
        <h2 className="text-h1 text-white mb-4">Ready to get started?</h2>
        <p className="text-body text-grey-light mb-8">Join thousands of Nigerian homes using CleanNG.</p>
        <Button size="lg" onClick={() => navigate("/register")}>
          Create a free account
        </Button>
      </section>
    </div>
  );
}
