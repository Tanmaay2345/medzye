import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // medicines.image / pharmacies.logo can point anywhere the DB owner uploads to,
      // most commonly this Supabase project's own storage bucket.
      {
        protocol: "https",
        hostname: "lzaxjqxmowpigpphwmnw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
