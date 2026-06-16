import { redirect } from 'next/navigation';

export default function NewOperationPage() {
  redirect('/operations?mode=new');
}
