import { PageViewTracker } from "@/components/admin/page-view-tracker";

// Bare layout: only the beacon — auth pages render their own full-screen panels.
// Tracking /auth/* makes the conversion funnel (view → signin → register) measurable.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker />
      {children}
    </>
  );
}
