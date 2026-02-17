import { Suspense } from 'react';
import AppShell from '@/components/AppShell';

export default function AppLayout({ children }) {
  return <AppShell><Suspense>{children}</Suspense></AppShell>;
}
