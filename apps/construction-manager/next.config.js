/** @type {import('next').NextConfig} */

// Set by the GitHub Pages deploy workflow only (see .github/workflows/deploy-construction-manager.yml)
// so local `npm run dev` / `npm run build` behave normally with no basePath.
const isGhPagesBuild = process.env.GITHUB_PAGES_BUILD === "true";

const nextConfig = {
  reactStrictMode: true,
  ...(isGhPagesBuild
    ? {
        output: "export",
        basePath: "/ag-ui",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

module.exports = nextConfig;
