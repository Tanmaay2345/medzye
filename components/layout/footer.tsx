import Image from "next/image";
import Link from "next/link";
import { Apple, Mail, Phone } from "lucide-react";
import type { Category } from "@/types/database";

const CATEGORY_FOOTER_LINKS = [
  "Pain Relief",
  "Cold and Flu",
  "Digestive Health",
  "Diabetes Care",
];

const FOOTER_COLUMNS: {
  heading: string;
  links: { label: string; href: string }[];
}[] = [
  {
    heading: "My Account",
    links: [
      { label: "My Account", href: "/account" },
      { label: "Order History", href: "/account/order-history" },
      { label: "Shopping Cart", href: "/cart" },
    ],
  },
  {
    heading: "Helps",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Faqs", href: "/faqs" },
      { label: "Terms & Condition", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    heading: "Proxy",
    links: [
      { label: "About", href: "/about" },
      { label: "Shop", href: "/shop" },
      { label: "Product", href: "/product" },
      { label: "Track Order", href: "/track-order" },
    ],
  },
];

function PlayStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="currentColor">
      <path d="M3.6 2.4a1 1 0 0 0-.6.9v17.4a1 1 0 0 0 .6.9l10.1-9.6L3.6 2.4Z" opacity={0.9} />
      <path d="M15.9 12l3.4-1.9c.8-.4.8-1.5 0-1.9L15.9 6.3 12.6 12l3.3 5.7 3.4-1.9c.8-.4.8-1.5 0-1.9L15.9 12Z" opacity={0.7} />
    </svg>
  );
}

export function Footer({ categories }: { categories: Category[] }) {
  const resolveCategoryHref = (label: string) => {
    const match = categories.find(
      (category) => category.name?.toLowerCase() === label.toLowerCase()
    );
    return match ? `/category/${match.id}` : "/";
  };

  return (
    <footer className="bg-brand-tint-light">
      <div className="bg-brand-primary">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-8 px-6 py-12 sm:flex-row sm:justify-between lg:px-[122px]">
          <div className="max-w-[452px] text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">Download Our App</h2>
            <p className="mt-3 text-white/90">
              Get exclusive offers and manage your healthcare needs better with our
              mobile app
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-3 font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Apple className="size-6" aria-hidden />
                App Store
              </Link>
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-3 font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <PlayStoreIcon />
                Play Store
              </Link>
            </div>
          </div>
          <div className="relative h-[169px] w-[476px] max-w-full">
            <Image
              src="/images/app-phone-mockup.png"
              alt="Medyze mobile app preview"
              fill
              sizes="476px"
              className="object-contain"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-[122px]">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="Medyze home">
              <Image src="/images/logo-mark.svg" alt="" width={28} height={24} />
              <span className="text-xl font-bold text-brand-navy-deep">Medyze</span>
            </Link>
            <p className="mt-4 max-w-[248px] text-sm text-brand-gray-600">
              Trusted Care for a better You. we provides choices with Reliable
              information. Choose Consciously
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-brand-gray-900">
              <a href="tel:+911234567890" className="flex items-center gap-2 hover:text-brand-primary">
                <Phone className="size-4" aria-hidden />
                +91 1234567890
              </a>
              <a
                href="mailto:Medyze@gmail.com"
                className="flex items-center gap-2 hover:text-brand-primary"
              >
                <Mail className="size-4" aria-hidden />
                Medyze@gmail.com
              </a>
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="font-medium text-brand-gray-900">{column.heading}</p>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-brand-gray-600">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-brand-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="font-medium text-brand-gray-900">Categories</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-brand-gray-600">
              {CATEGORY_FOOTER_LINKS.map((label) => (
                <li key={label}>
                  <Link href={resolveCategoryHref(label)} className="hover:text-brand-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
