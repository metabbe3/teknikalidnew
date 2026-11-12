import { Header } from "@/components/layout/header";
import LivePrice from "@/components/stock/live-price";
import { Footer } from "@/components/layout/footer";
import { PageViewTracker } from "@/components/admin/page-view-tracker";
import { RegistrationBottomSheet } from "@/components/ui/registration-bottom-sheet";
import { OnboardingWizard } from "@/components/ui/onboarding-wizard";
import { UhuProvider } from "@/components/uhu/uhu-provider";
import { UhuFab } from "@/components/uhu/uhu-fab";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <UhuProvider>
      <div className="flex flex-col flex-1">
        <PageViewTracker />
        <LivePrice />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <RegistrationBottomSheet />
        <OnboardingWizard />
        <UhuFab />
      </div>
    </UhuProvider>
  );
}
