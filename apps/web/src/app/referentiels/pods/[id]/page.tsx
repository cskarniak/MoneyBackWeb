import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

export default async function LegacyEditPodPage({ params }: Props) {
  const { id } = await params;
  redirect(`/referentiels/enveloppes/${id}`);
}
