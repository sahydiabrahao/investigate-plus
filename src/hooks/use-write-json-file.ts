import { useState, useCallback } from 'react';
import type { CaseJson } from '@/types/json-default';

type UseWriteJsonFileParams = {
  handle: FileSystemFileHandle | null;
};

type UseWriteJsonFileResult = {
  save: (data: CaseJson) => Promise<void>;
  saving: boolean;
  error: string | null;
};

export function useWriteJsonFile({ handle }: UseWriteJsonFileParams): UseWriteJsonFileResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (data: CaseJson) => {
      if (!handle) return;

      setSaving(true);
      setError(null);

      try {
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        setSaving(false);
      } catch (err) {
        console.error('Erro ao salvar JSON:', err);
        setError('Não foi possível salvar o arquivo do caso.');
        setSaving(false);
      }
    },
    [handle]
  );

  return { save, saving, error };
}
