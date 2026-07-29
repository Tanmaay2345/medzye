import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP as the fallback. Next only serves a format the browser
    // advertises in its Accept header, so anything without AVIF support still
    // gets WebP — this adds a smaller option rather than replacing one.
    formats: ["image/avif", "image/webp"],

    // Product artwork is immutable: a medicine's image sits at a stable
    // Storage path and changes only when the seeding pipeline re-uploads it.
    // The default 60s TTL makes the optimizer re-fetch and re-encode the same
    // bytes all day; 31 days lets the optimized variants stay cached.
    minimumCacheTTL: 2_678_400,

    // The seeding pipeline standardises every product image to 600x600 (and
    // pharmacy logos to 256x256). Next's default deviceSizes run to 3840, so
    // each srcset advertised candidates up to 6x larger than any source — the
    // optimizer cannot invent detail that isn't there, so those variants were
    // byte-identical to the 640 one while adding ~18% to the HTML of every
    // page. Capping at 1080 keeps headroom for larger future sources without
    // paying for candidates that can never be sharper.
    deviceSizes: [640, 828, 1080],

    // Restricted to this project's Storage bucket on purpose. A catch-all
    // `hostname: "**"` entry used to sit alongside this one, which turns
    // /_next/image into an open proxy: anyone could pass any remote URL and
    // have the deployment fetch, re-encode, cache and serve it under this
    // domain. Every medicines.image and pharmacies.logo value in the database
    // is on this host, so narrowing it closes that without affecting anything.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lzaxjqxmowpigpphwmnw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
