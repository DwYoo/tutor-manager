import { supabase } from '@/lib/supabase';
import ShareClient from './ShareClient';

export async function generateMetadata({ params }) {
  const { token } = await params;
  const base = { title: '과외 매니저', description: '과외 선생님을 위한 올인원 관리 도구' };

  try {
    const { data } = await supabase
      .from('students')
      .select('name,subject,grade,school')
      .eq('share_token', token)
      .maybeSingle();

    if (!data) return base;

    const name = data.name || '학생';
    const subject = data.subject || '';
    const detail = [subject, data.grade, data.school].filter(Boolean).join(' · ');
    const title = `${name} ${subject ? subject + ' ' : ''}학습 현황`;
    const description = detail ? `${name} (${detail}) 학습 현황 공유 페이지` : `${name} 학습 현황 공유 페이지`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: '과외 매니저',
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch {
    return base;
  }
}

export default async function SharePage({ params }) {
  const { token } = await params;
  return <ShareClient token={token} />;
}
