/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Ensure heavy Node-only libraries like Baileys & ws are not bundled
   * into Next's server runtime, so they can run in a plain Node.js
   * environment (avoids issues like bufferUtil.mask not being a function).
   */
  experimental: {
    serverComponentsExternalPackages: [
      "@whiskeysockets/baileys",
      "ws",
      "@hapi/boom",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.ecostvm.com", pathname: "/**" },
      { protocol: "https", hostname: "static.wixstatic.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
