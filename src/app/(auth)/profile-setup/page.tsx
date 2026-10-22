import ProfileSetupModal from "@/components/ProfileSetupModal";
import SignedInOnly from "@/components/SignedInOnly";

export default function ProfileSetupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-950">
      {/* It shows the email and phone number: signed out → home (#252) */}
      <SignedInOnly />
      <ProfileSetupModal />
    </div>
  );
}
