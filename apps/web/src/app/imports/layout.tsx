import { CrudLayoutShell } from '@/components/layout/CrudLayoutShell';

export default function ImportsLayout({ children }: { children: React.ReactNode }) {
  return <CrudLayoutShell>{children}</CrudLayoutShell>;
}
