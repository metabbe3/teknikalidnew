import type { Metadata } from "next";
import { SharesView } from "./shares-view";

export const metadata: Metadata = { title: "Share Tracking — Admin" };

export default function SharesPage() {
  return <SharesView />;
}
