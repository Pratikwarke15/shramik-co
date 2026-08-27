import { Handshake } from "lucide-react";
import Link from "next/link";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Handshake className="h-12 w-12" />
          <span className="text-3xl font-bold font-heading">Shramik Co</span>
        </Link>
        <p className="mt-6 max-w-md text-center text-lg text-indigo-100">
          Empowering local workers through cooperative gig services with fair commissions and social security.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-6 text-center text-white/80 text-sm">
          <div><p className="text-2xl font-bold text-white">500+</p><p>Workers</p></div>
          <div><p className="text-2xl font-bold text-white">10K+</p><p>Jobs Done</p></div>
          <div><p className="text-2xl font-bold text-white">50+</p><p>Co-ops</p></div>
          <div><p className="text-2xl font-bold text-white">&lt;5%</p><p>Commission</p></div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="absolute right-4 top-4"><LanguageSelector /></div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
