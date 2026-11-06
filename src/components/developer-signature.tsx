"use client";

import { useEffect } from "react";
import { site } from "@/lib/site";

// A note for anyone who opens the browser console. Nothing shows on the page.
export function DeveloperSignature() {
  useEffect(() => {
    console.info(
      `%cQAHAF%c\nDesigned and built by ${site.developer.name}\n${site.developer.url}`,
      "font: 600 22px Georgia, serif; letter-spacing: 0.35em; color: #1E1916",
      "font: 12px sans-serif; line-height: 1.6; color: #4A3525",
    );
  }, []);
  return null;
}
