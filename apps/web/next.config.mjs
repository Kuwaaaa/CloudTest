const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  ...(allowedDevOrigins.length
    ? {
        experimental: {
          allowedDevOrigins,
        },
      }
    : {}),
};

export default nextConfig;
