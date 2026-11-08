import RenterProfileForm from "@/components/RenterProfileForm";
import SignedInOnly from "@/components/SignedInOnly";

export default function RenterProfileSetupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-4 sm:p-6 dark:bg-zinc-950">
      {/* Signed out → home (#252) */}
      <SignedInOnly />
      <RenterProfileForm />
    </div>
  );
}
