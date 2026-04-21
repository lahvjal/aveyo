import { redirect } from 'next/navigation';

/** Legacy URL — customer selection now lives in the dashboard header for admins. */
export default function ViewAsCustomerRedirectPage() {
  redirect('/dashboard');
}
