import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

if (process.env.NODE_ENV === "development" && process.env.DB_DRIVER !== "sqlite") {
  try {
    initOpenNextCloudflareForDev();
  } catch {
    // در صورت عدم دسترسی نادیده گرفته شود
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;