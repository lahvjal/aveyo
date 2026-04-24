'use client';

import CustomerVideoModal from './CustomerVideoModal';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME_VIDEO_URL =
  'https://vz-bd3d2939-ded.b-cdn.net/69dac578-fe92-4636-8225-16b52d7b29ec/play_1080p.mp4';

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  return (
    <CustomerVideoModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Welcome"
      title="Welcome to your Aveyo customer portal"
      description="Start with a quick welcome from our CEO. This video is shown the first time you log in so you can get oriented before exploring the rest of your portal."
      videoSrc={WELCOME_VIDEO_URL}
      closeLabel="Continue to portal"
      autoPlay
    />
  );
}

