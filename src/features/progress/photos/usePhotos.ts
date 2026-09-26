import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';
import type { ImageMediaType } from '@/lib/images';

import { useSessionStore } from '../../auth/sessionStore';
import { addPhoto, deletePhoto, loadPhotos, SIGNED_URL_SECONDS, type ProgressPhoto } from './api';

export function usePhotos() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['progressPhotos', userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadPhotos(userId!),
    // Refresh signed URLs well before they expire.
    staleTime: (SIGNED_URL_SECONDS / 2) * 1000,
    refetchInterval: (SIGNED_URL_SECONDS / 2) * 1000,
  });
  const add = useMutation({
    mutationFn: (photo: { base64: string; mediaType: ImageMediaType }) => addPhoto(userId!, photo),
    onSuccess: () => haptics.success(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: (photo: ProgressPhoto) => deletePhoto(photo),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return { query, add, remove };
}
