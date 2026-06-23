import { CrudLayoutShell } from '@/components/layout/CrudLayoutShell';

export default function OutilsLayout({ children }: { children: React.ReactNode }) {
  return <CrudLayoutShell>{children}</CrudLayoutShell>;
}
