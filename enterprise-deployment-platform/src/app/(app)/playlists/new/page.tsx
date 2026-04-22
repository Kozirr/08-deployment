import { getWizardDraft } from '@/app/actions/playlist-wizard';
import { PlaylistWizard } from './PlaylistWizard';

export const metadata = { title: 'Create playlist — Tempo' };

export default async function NewPlaylistPage() {
  let initial = null;
  try {
    initial = await getWizardDraft();
  } catch {
    // unauthorized — middleware will have redirected already
  }
  return <PlaylistWizard initialDraft={initial} />;
}
