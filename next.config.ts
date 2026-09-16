import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Les photos de détenu pèsent jusqu'à 8 Mo chacune côté API, et deux peuvent
      // transiter dans le même envoi. La limite par défaut (1 Mo) les refuserait.
      bodySizeLimit: "18mb",
    },
  },
  images: {
    // Les photos sont servies par Cloudinary, via l'URL renvoyée par l'API
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
