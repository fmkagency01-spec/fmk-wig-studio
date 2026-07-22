"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function HomeTracker() {
  useEffect(() => {
    void trackEvent({ event_name: "home_view" });
  }, []);
  return null;
}
