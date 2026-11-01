import { useMemo, useState } from 'react';
import { Button, Card, CardBody, EmptyState, Input, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCollection } from '@/hooks/useCollection';
import { useToast } from '@/hooks/useToast';
import { featureFlagsQuery, setFeatureFlag } from '@/services';
import { formatDate } from '@/utils/format';
import { toMessage } from '@/utils/errors';

export function AdminFeatureFlagsPage() {
  const toast = useToast();
  const flags = useCollection(useMemo(() => featureFlagsQuery(), []));
  const rows = flags.status === 'ready' ? flags.data : [];

  const [newFlagId, setNewFlagId] = useState('');
  const [newFlagDescription, setNewFlagDescription] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (flagId: string, enabled: boolean) => {
    setBusyId(flagId);
    setError(null);
    try {
      await setFeatureFlag(flagId, enabled);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const createFlag = async () => {
    const id = newFlagId.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    if (!id) return;
    setBusyId(id);
    setError(null);
    try {
      await setFeatureFlag(id, false, newFlagDescription.trim() || 'No description yet.');
      toast.success(`Flag "${id}" created.`);
      setNewFlagId('');
      setNewFlagDescription('');
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Feature Flags" description="Toggle platform-wide features without a deploy." />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full sm:w-48">
            <Input
              label="Flag id"
              placeholder="e.g. new_checkout"
              value={newFlagId}
              onChange={(e) => setNewFlagId(e.target.value)}
            />
          </div>
          <div className="w-full flex-1 sm:w-auto">
            <Input
              label="Description"
              placeholder="What this flag controls"
              value={newFlagDescription}
              onChange={(e) => setNewFlagDescription(e.target.value)}
            />
          </div>
          <Button
            type="button"
            loading={busyId === newFlagId.trim().toLowerCase()}
            disabled={!newFlagId.trim()}
            onClick={createFlag}
          >
            Add flag
          </Button>
        </CardBody>
      </Card>

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>
      )}

      {flags.status === 'loading' && (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      )}

      {flags.status === 'error' && (
        <Card>
          <EmptyState title="Flags did not load" description={flags.error} />
        </Card>
      )}

      {flags.status === 'ready' && rows.length === 0 && (
        <Card>
          <EmptyState title="No feature flags yet" description="Add one above to gate a feature without shipping code." />
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <div className="divide-y divide-line">
            {rows.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-ink">{flag.id}</p>
                  <p className="truncate text-xs text-muted">{flag.description}</p>
                  <p className="text-xs text-muted">
                    Updated {formatDate(flag.updatedAt)}
                    {flag.updatedBy ? ` by ${flag.updatedBy}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={flag.enabled ? 'primary' : 'secondary'}
                  size="sm"
                  loading={busyId === flag.id}
                  onClick={() => toggle(flag.id, !flag.enabled)}
                >
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
