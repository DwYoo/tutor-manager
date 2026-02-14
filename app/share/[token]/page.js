'use client';
import { useParams } from 'next/navigation';
import ShareView from '@/components/ShareView';

export default function SharePage() {
  const { token } = useParams();
  return <ShareView token={token} />;
}
