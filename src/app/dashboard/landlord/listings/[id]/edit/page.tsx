export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // TODO: same form as new/page.tsx, pre-filled. RLS's "update own
  // listings only" policy means this fails safe even if someone edits
  // the URL to another landlord's listing id.
  return <div>Edit listing — TODO (id: {id})</div>;
}
