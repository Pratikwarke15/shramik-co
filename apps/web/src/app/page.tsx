import Link from "next/link";
import { Handshake, MapPin, Shield, Users, Star, ArrowRight } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

const features = [
  { icon: MapPin, title: "Geospatial Matching", description: "Find the nearest available workers in your area using real-time location matching." },
  { icon: Shield, title: "Fair Commission (<5%)", description: "Workers keep what they earn. Our cooperative model ensures minimal commission rates." },
  { icon: Users, title: "Social Security", description: "Every worker gets health insurance, retirement benefits, and emergency funds." },
  { icon: Star, title: "Cooperative Governance", description: "Democratic decision-making with transparent dividend distribution for all members." },
];

const steps = [
  { num: "01", title: "Book a Service", description: "Choose your service, enter your location, and select a time." },
  { num: "02", title: "Get Matched", description: "Our system finds the best nearby worker based on skills and availability." },
  { num: "03", title: "Job Complete", description: "Service delivered, payment held in escrow, and automatic dividend calculation." },
];

const stats = [
  { value: "500+", label: "Workers" },
  { value: "10,000+", label: "Jobs Completed" },
  { value: "50+", label: "Co-ops" },
  { value: "4.8★", label: "Avg Rating" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Handshake className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold font-heading text-gray-900">Shramik Co</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log in</Link>
            <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">Sign up</Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 py-24">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Empowering Local Workers Through
            <br />
            <span className="text-amber-300">Cooperative Gig Services</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100">
            A fair, transparent, and democratic platform where workers earn more, consumers pay less,
            and communities thrive together.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register?role=consumer"
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-700 shadow-lg hover:bg-gray-50 transition-all"
            >
              I&apos;m a Consumer <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register?role=worker"
              className="flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              I&apos;m a Worker <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 font-heading">Why Shramik Co?</h2>
            <p className="mt-3 text-gray-500">Built for workers, by the community</p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 font-heading">How It Works</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">{s.num}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-indigo-600 sm:text-4xl font-heading">{s.value}</p>
                <p className="mt-2 text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
