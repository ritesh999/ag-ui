/** @type {import('next').NextConfig} */

// Static export is used for any static host (GitHub Pages, Netlify, ...).
// The GitHub Pages basePath is separate since it's a project-page subpath
// (github.io/ag-ui/) — Netlify and other hosts serve from the domain root
// and must NOT set it. Both are env-gated so local `npm run dev` / `npm run
// build` behave normally with no export/basePath.
const staticExport = process.env.STATIC_EXPORT === "true";
const ghPagesBasePath = process.env.GH_PAGES_BASE_PATH === "true";

const nextConfig = {
  reactStrictMode: true,
  ...(staticExport
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  ...(ghPagesBasePath ? { basePath: "/ag-ui" } : {}),
};

module.exports = nextConfig;
