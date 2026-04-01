'use client';

import AppShell from '@/components/layout/AppShell';
import { ProjectsProvider } from '@/context/ProjectsContext';
import WelcomeModal from '@/components/ui/WelcomeModal';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { showWelcomeModal, dismissWelcomeModal } = useAuth();

  return (
    <ProjectsProvider>
      {children}
      <WelcomeModal isOpen={showWelcomeModal} onClose={dismissWelcomeModal} />
    </ProjectsProvider>
  );
}
