import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // If your repository is not the user root (e.g., username.github.io/aquaxchange_3d),
  // you must set the basePath and assetPrefix so it finds your files.
  basePath: "/aquaxchange_3d",
  assetPrefix: "/aquaxchange_3d/",
};

export default nextConfig;