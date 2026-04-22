'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  saveWizardStepAction,
  finishWizardAction,
  cancelWizardAction,
  type WizardDraft,
  type WizardStep,
} from '@/app/actions/playlist-wizard';
import type { ActionResult } from '@/app/actions/common';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'tracks', label: 'Finish' },
];

export function PlaylistWizard({ initialDraft }: { initialDraft: WizardDraft | null }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(initialDraft?.step ?? 'basics');
  const [draft, setDraft] = useState<Partial<WizardDraft>>(initialDraft ?? {});

  const [saveState, saveAction, savePending] = useActionState<
    ActionResult<{ step: WizardStep; nextStep: WizardStep | null }> | null,
    FormData
  >(async (prev, form) => {
    const res = await saveWizardStepAction(prev, form);
    if (res.ok && res.data.nextStep) setStep(res.data.nextStep);
    return res;
  }, null);

  const [finishState, finishAction, finishPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(finishWizardAction, null);

  async function cancel() {
    await cancelWizardAction();
    router.push('/library');
  }

  const currentIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Create a playlist</h1>
        <p className="text-muted text-sm mt-1">
          Your progress is saved securely and continues if you refresh.
        </p>
      </header>

      <nav aria-label="Wizard steps" className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= currentIdx ? 'bg-spotify-green-400 text-black' : 'bg-surface text-muted'
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= currentIdx ? 'font-semibold' : 'text-muted'}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="text-muted">→</span>}
          </div>
        ))}
      </nav>

      <Card>
        {step === 'basics' && (
          <form action={saveAction} className="flex flex-col gap-3">
            <input type="hidden" name="step" value="basics" />
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
            <Input
              name="title"
              required
              defaultValue={draft.title ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Late night drive"
              error={saveState && !saveState.ok ? saveState.error : undefined}
            />
            <label className="text-xs font-semibold uppercase tracking-wide text-muted mt-2">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={draft.description ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="rounded-card bg-surface-elevated p-3 text-sm resize-none"
              placeholder="What's this playlist about?"
            />
            <WizardFooter pending={savePending} onCancel={cancel} />
          </form>
        )}

        {step === 'appearance' && (
          <form action={saveAction} className="flex flex-col gap-3">
            <input type="hidden" name="step" value="appearance" />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Gradient start
                </label>
                <input
                  type="color"
                  name="coverFromColor"
                  defaultValue={draft.coverFromColor ?? '#1db954'}
                  className="h-16 w-full rounded-card cursor-pointer bg-surface-elevated"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Gradient end
                </label>
                <input
                  type="color"
                  name="coverToColor"
                  defaultValue={draft.coverToColor ?? '#0d5f28'}
                  className="h-16 w-full rounded-card cursor-pointer bg-surface-elevated"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                name="isPublic"
                defaultChecked={draft.isPublic ?? true}
                className="h-4 w-4 accent-spotify-green-400"
              />
              <span className="text-sm">Visible to other listeners</span>
            </label>
            <WizardFooter pending={savePending} onCancel={cancel} onBack={() => setStep('basics')} />
          </form>
        )}

        {step === 'tracks' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Review your playlist. You can add tracks from artist or search pages after creation.
            </p>
            <div className="rounded-card p-6 bg-surface-elevated">
              <div
                className="w-24 h-24 rounded-sm mb-3"
                style={{
                  background: `linear-gradient(135deg, ${draft.coverFromColor ?? '#1db954'}, ${draft.coverToColor ?? '#0d5f28'})`,
                }}
                aria-hidden
              />
              <p className="text-xl font-bold">{draft.title ?? 'Untitled'}</p>
              {draft.description && <p className="text-sm text-muted">{draft.description}</p>}
              <p className="text-xs text-muted mt-2">
                {draft.isPublic ?? true ? 'Public' : 'Private'}
              </p>
            </div>

            <form action={finishAction} className="flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep('appearance')}>
                Back
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={finishPending}>
                {finishPending ? 'Creating…' : 'Create playlist'}
              </Button>
            </form>
            {finishState && !finishState.ok && (
              <p className="text-sm text-accent-pink">{finishState.error}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function WizardFooter({
  pending,
  onCancel,
  onBack,
}: {
  pending: boolean;
  onCancel: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 mt-2">
      {onBack && (
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </div>
  );
}
