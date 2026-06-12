import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Account preferences</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-accent" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Edit your profile, username, and avatar.
          </p>
          <Link
            href="/profile/edit"
            className="inline-flex items-center text-sm text-accent underline underline-offset-2 hover:text-accent/80"
          >
            Edit Profile
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
