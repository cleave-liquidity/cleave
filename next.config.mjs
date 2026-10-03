/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ["@rainbow-me/rainbowkit", "wagmi", "viem"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm/upto/client": false,
      "@x402/evm/exact/client": false,
      "@x402/core/client": false,
      "@x402/svm/exact/client": false,
      "@x402/evm": false,
      "react-native": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
