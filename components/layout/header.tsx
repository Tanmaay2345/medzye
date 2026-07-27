import Image from "next/image";
import Link from "next/link";
import { ChevronDown, MapPin, User } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";

export function Header() {
  return (
    <header className="border-b border-brand-border bg-white">
      <div className="mx-auto flex w-full max-w-[1196px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-0">
        <nav
          aria-label="Primary"
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <Link href="/" className="flex items-center gap-3" aria-label="Medyze home">
            <Image src="/images/logo-mark.svg" alt="" width={35} height={30} priority />
            <span className="text-2xl font-bold tracking-tight text-brand-navy-deep">
              Medyze
            </span>
          </Link>

          <div className="flex items-center gap-2 text-brand-gray-600">
            <Link
              href="/sign-in"
              className="flex h-14 items-center gap-2 rounded-[8px] border border-brand-border px-4 font-medium transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <User className="size-6" aria-hidden />
              Sign In
            </Link>
            <Link
              href="/select-location"
              className="flex h-14 items-center gap-2 rounded-[8px] border border-brand-border px-4 font-medium transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <MapPin className="size-6" aria-hidden />
              Select Location
              <ChevronDown className="size-4" aria-hidden />
            </Link>
          </div>
        </nav>

        <SearchBar />
      </div>
    </header>
  );
}
