import { Handshake } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Handshake className="h-6 w-6 text-indigo-600" />
              <span className="text-lg font-bold font-heading text-gray-900">Shramik Co</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Empowering local workers through cooperative gig services with fair commissions, social
              security, and transparent governance.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Platform</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/book" className="text-sm text-gray-500 hover:text-gray-700">Book a Service</Link></li>
              <li><Link href="/register" className="text-sm text-gray-500 hover:text-gray-700">Become a Worker</Link></li>
              <li><Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Company</h3>
            <ul className="mt-3 space-y-2">
              <li><span className="text-sm text-gray-500">About Us</span></li>
              <li><span className="text-sm text-gray-500">Contact</span></li>
              <li><span className="text-sm text-gray-500">Careers</span></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li><span className="text-sm text-gray-500">Privacy Policy</span></li>
              <li><span className="text-sm text-gray-500">Terms of Service</span></li>
              <li><span className="text-sm text-gray-500">Cooperative Bylaws</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center">
          <p className="text-sm text-gray-400">
            Powered by Cooperative Gig Platform &copy; {new Date().getFullYear()} SIH26089
          </p>
        </div>
      </div>
    </footer>
  );
}
