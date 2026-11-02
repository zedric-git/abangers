import { Home } from "lucide-react";
import HomeActions from "@/components/HomeActions";

export default function HomePage() {
  // Everyone gets the same buttons, signed in or not (#271), so this page
  // doesn't read the session. #245 showed signed-in users "Go to my
  // dashboard" instead, but closing the tab doesn't sign you out, so a
  // landlord who came back later never saw sign-up and Login.
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center justify-center space-y-8 py-12 text-center">
        {/* Branding / Header */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md">
            <Home className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Abangers
          </h1>
          <p className="mx-auto max-w-xs text-zinc-500 dark:text-zinc-400">
            Discover the perfect boarding house or manage your rental properties
            seamlessly.
          </p>
        </div>

        {/* Call to Actions (and the login / sign-up popup) */}
        <HomeActions />
      </main>
    </div>
  );
}
