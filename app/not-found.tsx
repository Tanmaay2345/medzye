import Link from "next/link";
import { PackageSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <PackageSearch className="size-12 text-brand-primary" aria-hidden />
      <h1 className="text-2xl font-bold text-brand-navy">Page not found</h1>
      <p className="max-w-md text-brand-gray-500">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-brand-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
      >
        Back to Home
      </Link>
    </div>
  );
}
