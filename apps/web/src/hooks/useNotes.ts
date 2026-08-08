import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NotesResponse = {
  items: Note[];
  total: number;
  page: number;
  limit: number;
  highlightIndex: number | null;
};

export type NoteFilters = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  highlightId?: string;
};

export type NotePayload = {
  title: string;
  content?: string;
};

const KEY = 'notes';

export function useNotes(filters: NoteFilters) {
  return useQuery<NotesResponse>({
    queryKey: [KEY, filters],
    queryFn: () => api.get('/notes', { params: filters }).then(r => r.data),
  });
}

export function useNote(id: string) {
  return useQuery<Note>({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/notes/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation<Note, Error, NotePayload>({
    mutationFn: payload => api.post('/notes', payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation<Note, Error, { id: string } & Partial<NotePayload>>({
    mutationFn: ({ id, ...payload }) => api.patch(`/notes/${id}`, payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation<Note, Error, string>({
    mutationFn: id => api.delete(`/notes/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
