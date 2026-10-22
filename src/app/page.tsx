import { Home } from "lucide-react";
import HomeActions from "@/components/HomeActions";
import { resolvePostLoginPath } from "@/lib/auth/post-login";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // A signed-in user gets a button to their own dashboard instead of
  // sign-up and Login (#245). Where they belong is decided by the same
  // helper as login and the proxy's dashboard guard (#170), so the three
  // can't disagree. Reading the session (cookies) makes this page render
  // on every request instead of once at build time.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // null: signed out, or no usable role. They get the signed-out buttons.
  let dashboardPath: string | null = null;
  if (user) {
    const result = await resolvePostLoginPath(supabase, user);
    if (result.ok) dashboardPath = result.path;
  }

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
        <HomeActions dashboardPath={dashboardPath} />
      </main>
    </div>
  );
}
