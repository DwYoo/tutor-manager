'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import StudentDetail from '@/components/StudentDetail';
import { C } from '@/components/Colors';

export default function StudentDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !params.id) return;
    supabase.from('students').select('*').eq('id', params.id).single()
      .then(({ data }) => { setStudent(data); setLoading(false); });
  }, [user, params.id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ color: C.tt, fontSize: 14 }}>로딩 중...</div>
    </div>
  );
  if (!student) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ color: C.tt, fontSize: 14 }}>학생을 찾을 수 없습니다</div>
    </div>
  );

  const mt = searchParams.get('mainTab');
  const st = searchParams.get('subTab');
  const initialTab = (mt || st) ? { mainTab: mt || 'class', subTab: st || undefined } : null;

  return <StudentDetail student={student} initialTab={initialTab} />;
}
