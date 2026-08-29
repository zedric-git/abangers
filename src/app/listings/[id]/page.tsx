export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // TODO: fetch this listing by id, render full details, add
  // save-to-favorites and inquiry actions.
  return <div>Listing detail — TODO (id: {id})</div>;
}
