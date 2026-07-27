import Image from "next/image";
import Link from "next/link";

export function ConsultDoctorBanner() {
  return (
    <Link
      href="/consult-a-doctor"
      className="relative block aspect-[462/259] w-full overflow-hidden rounded-[5px] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      aria-label="No prescription? No problem! Consult a doctor now"
    >
      <Image
        src="/images/consult-doctor-banner.png"
        alt="No prescription? No problem! Consult a doctor now"
        fill
        sizes="(min-width: 1024px) 462px, 100vw"
        style={{ objectPosition: "50% 32%" }}
        className="object-cover"
      />
    </Link>
  );
}
