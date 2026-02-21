import { supabase } from '@/lib/supabase';
import ShareClient from './ShareClient';

export async function generateMetadata({ params }) {
  const { token } = await params;
  const base = {
    title: '학습 현황 공유 | 과외 매니저',
    description: '과외 선생님이 공유한 학습 현황 페이지입니다',
    openGraph: {
      title: '학습 현황 공유 | 과외 매니저',
      description: '과외 선생님이 공유한 학습 현황 페이지입니다',
      type: 'website',
      siteName: '과외 매니저',
    },
    twitter: {
      card: 'summary',
      title: '학습 현황 공유 | 과외 매니저',
      description: '과외 선생님이 공유한 학습 현황 페이지입니다',
    },
  };

  try {
    // RPC로 먼저 시도
    const { data: rpcData } = await supabase.rpc('get_shared_student_data', { p_token: token });
    let name, subject, grade, school;

    if (rpcData?.student) {
      ({ name, subject, grade, school } = rpcData.student);
    } else {
      // fallback: 직접 조회
      const { data } = await supabase
        .from('students')
        .select('name,subject,grade,school')
        .eq('share_token', token)
        .maybeSingle();
      if (!data) return base;
      ({ name, subject, grade, school } = data);
    }

    name = name || '학생';
    subject = subject || '';
    const detail = [subject, grade, school].filter(Boolean).join(' · ');
    const title = `${name} ${subject ? subject + ' ' : ''}학습 현황`;
    const description = detail ? `${name} (${detail}) 학습 현황 공유 페이지` : `${name} 학습 현황 공유 페이지`;

    return {
      title: `${title} | 과외 매니저`,
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
