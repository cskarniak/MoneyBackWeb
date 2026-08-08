import { CrudLayoutShell } from '@/components/layout/CrudLayoutShell';

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <CrudLayoutShell>{children}</CrudLayoutShell>;
}
