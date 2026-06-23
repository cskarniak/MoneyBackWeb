import { CrudLayoutShell } from '@/components/layout/CrudLayoutShell';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return <CrudLayoutShell>{children}</CrudLayoutShell>;
}
