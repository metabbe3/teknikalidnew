import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageViewTracker } from "@/components/admin/page-view-tracker";
import { RegistrationBottomSheet } from "@/components/ui/registration-bottom-sheet";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <PageViewTracker />
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
      <RegistrationBottomSheet />
    </div>
  );
}
