'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('인증 이메일을 확인해주세요!');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });
        if (error) throw error;
        setMessage('비밀번호 재설정 이메일을 보냈습니다.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : err.message);
    }
    setLoading(false);
  };

  const handleSocial = async (provider) => {
    setError('');
    if (provider === 'kakao') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const redirectTo = encodeURIComponent(`${window.location.origin}`);
      const kakaoUrl = `${supabaseUrl}/auth/v1/authorize?provider=kakao&redirect_to=${redirectTo}`;
      window.location.href = kakaoUrl;
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-5">
      <div className="login-card bg-sf rounded-[20px] w-full max-w-[420px] shadow-lg border border-bd" style={{ padding: 'clamp(24px, 5vw, 40px)' }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-md" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
            <span className="text-white text-[26px] font-extrabold">T</span>
          </div>
          <h1 className="text-[22px] font-extrabold text-tp mb-1">과외 매니저</h1>
          <p className="text-[13px] text-tt">
            {mode === 'signup' ? '새 계정을 만들어보세요' : mode === 'forgot' ? '비밀번호를 재설정합니다' : '선생님 전용 관리 도구'}
          </p>
        </div>

        {/* Social login buttons */}
        {mode !== 'forgot' && (
          <div className="flex flex-col gap-2.5 mb-6">
            <button onClick={() => handleSocial('kakao')}
              className="social-btn w-full py-3 rounded-[10px] border-none text-sm font-semibold cursor-pointer font-[inherit] flex items-center justify-center gap-2.5 transition-all hover:-translate-y-px hover:shadow-md"
              style={{ background: '#FEE500', color: '#191919' }}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.74 4.93 4.38 6.24l-1.12 4.12c-.1.36.32.64.64.44l4.84-3.2c.42.04.84.06 1.26.06 5.52 0 10-3.36 10-7.66C22 6.36 17.52 3 12 3z" fill="#191919"/></svg>
              카카오로 시작하기
            </button>
            <button onClick={() => handleSocial('google')}
              className="social-btn w-full py-3 rounded-[10px] border border-bd bg-sf text-tp text-sm font-semibold cursor-pointer font-[inherit] flex items-center justify-center gap-2.5 transition-all hover:-translate-y-px hover:shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google로 시작하기
            </button>
          </div>
        )}

        {/* Divider */}
        {mode !== 'forgot' && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-bd" />
            <span className="text-xs text-tt">또는 이메일로</span>
            <div className="flex-1 h-px bg-bd" />
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일"
            className="w-full py-3 px-3.5 rounded-[10px] border border-bd text-base text-tp bg-sf outline-none font-[inherit] focus:border-ac transition-colors" autoComplete="email" />
          {mode !== 'forgot' && (
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호"
              className="w-full py-3 px-3.5 rounded-[10px] border border-bd text-base text-tp bg-sf outline-none font-[inherit] focus:border-ac transition-colors" autoComplete="current-password" />
          )}

          {error && <div className="text-xs text-dn py-2 px-3 bg-db rounded-lg">{error}</div>}
          {message && <div className="text-xs text-su py-2 px-3 bg-sb rounded-lg">{message}</div>}

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {mode === 'signup' ? '회원가입' : mode === 'forgot' ? '재설정 이메일 보내기' : '로그인'}
          </Button>
        </form>

        {/* Footer links */}
        <div className="mt-5 text-center text-[13px] flex flex-col gap-2">
          {mode === 'login' && (
            <>
              <div>
                <span className="text-ts">계정이 없으신가요? </span>
                <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className="bg-transparent border-none cursor-pointer font-[inherit] text-ac text-[13px] font-semibold hover:underline">회원가입</button>
              </div>
              <button onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="bg-transparent border-none cursor-pointer font-[inherit] text-tt text-xs hover:underline">비밀번호를 잊으셨나요?</button>
            </>
          )}
          {mode === 'signup' && (
            <div>
              <span className="text-ts">이미 계정이 있으신가요? </span>
              <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="bg-transparent border-none cursor-pointer font-[inherit] text-ac text-[13px] font-semibold hover:underline">로그인</button>
            </div>
          )}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="bg-transparent border-none cursor-pointer font-[inherit] text-ac text-[13px] font-semibold hover:underline">← 로그인으로 돌아가기</button>
          )}
        </div>
      </div>
    </div>
  );
}
