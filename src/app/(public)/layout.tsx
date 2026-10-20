import { Header } from "@/components/layout/header";
import LivePrice from "@/components/stock/live-price";
import { Footer } from "@/components/layout/footer";
import { PageViewTracker } from "@/components/admin/page-view-tracker";
import { RegistrationBottomSheet } from "@/components/ui/registration-bottom-sheet";
import { OnboardingWizard } from "@/components/ui/onboarding-wizard";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <PageViewTracker />
      <LivePrice />
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
      <RegistrationBottomSheet />
      <OnboardingWizard />
    </div>
  );
}
