import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/lib/auth/post-login";
import PublicListingsView from "@/components/PublicListingsView";
import type { Listing } from "@/types/listing";

export default async function ListingsPage() {
  const supabase = await createClient();

  // 1. Check if the visitor is signed in and where they belong
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dashboardPath: string | null = null;
  if (user) {
    const result = await resolvePostLoginPath(supabase, user);
    if (result.ok) dashboardPath = result.path;
  }

  // 2. Fetch public active listings (allowed by RLS "listings viewable by everyone")
  const { data: listingsData, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching public listings:", error);
  }

  const listings: Listing[] = (listingsData || []) as Listing[];

  return (
    <PublicListingsView listings={listings} dashboardPath={dashboardPath} />
  );
}
