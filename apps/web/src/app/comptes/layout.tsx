import { CrudLayoutShell } from '@/components/layout/CrudLayoutShell';

export default function ComptesLayout({ children }: { children: React.ReactNode }) {
  return <CrudLayoutShell>{children}</CrudLayoutShell>;
}
