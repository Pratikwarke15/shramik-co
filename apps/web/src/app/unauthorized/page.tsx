import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <ShieldAlert className="h-16 w-16 text-red-500" />
      <h1 className="mt-6 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        You do not have permission to view this page. If you believe this is a mistake, please contact
        your cooperative administrator.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Back to Login
      </Link>
    </div>
  );
}
