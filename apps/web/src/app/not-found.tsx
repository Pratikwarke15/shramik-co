import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-indigo-100">
          <span className="text-6xl font-bold text-indigo-600">404</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 font-heading">Page Not Found</h1>
        <p className="mx-auto mt-3 max-w-md text-gray-500">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
        </p>
        <Link href="/" className="mt-8 inline-block">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
