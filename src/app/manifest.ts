import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TeknikalID",
    short_name: "TeknikalID",
    description: "IDX technical analysis platform",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0d9488",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
