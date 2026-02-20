'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { C } from '@/components/Colors';

const ERROR_MAP = {
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
  'Email rate limit exceeded': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  'User already registered': '이미 등록된 이메일입니다.',
  'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
  'Signup requires a valid password': '유효한 비밀번호를 입력해주세요.',
  'Unable to validate email address: invalid format': '올바른 이메일 형식을 입력해주세요.',
};

function translateError(msg) {
  if (!msg) return '';
  if (ERROR_MAP[msg]) return ERROR_MAP[msg];
  if (msg.includes('rate limit')) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (msg.includes('network') || msg.includes('fetch')) return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
  if (msg.includes('password') && msg.includes('6')) return '비밀번호는 6자 이상이어야 합니다.';
  return msg;
}

function getPasswordStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: '약함', color: C.dn };
  if (score <= 3) return { level: 2, label: '보통', color: C.wn };
  return { level: 3, label: '강함', color: C.su };
}

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
      setError(translateError(err.message));
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
    if (error) setError(translateError(error.message));
  };

  const switchMode = (m) => { setMode(m); setError(''); setMessage(''); setShowPw(false); };
  const pwStrength = mode === 'signup' ? getPasswordStrength(password) : null;

  const is = { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.bd}`, fontSize: 16, color: C.tp, background: C.sf, outline: "none", fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s" };
  const btn = { width: "100%", padding: "12px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="login-card" style={{ background: C.sf, borderRadius: 20, padding: 'clamp(24px, 5vw, 40px)', width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,.06)", border: `1px solid ${C.bd}` }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 4px 16px rgba(37,99,235,.25)" }}>
            <span style={{ color: "#fff", fontSize: 26, fontWeight: 800 }}>T</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.tp, marginBottom: 4 }}>과외 매니저</h1>
          <p style={{ fontSize: 13, color: C.tt }}>
            {mode === 'signup' ? '새 계정을 만들어보세요' : mode === 'forgot' ? '비밀번호를 재설정합니다' : '선생님 전용 관리 도구'}
          </p>
        </div>

        {/* Social login buttons */}
        {mode !== 'forgot' && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <button className="social-btn" onClick={() => handleSocial('kakao')}
              style={{ ...btn, background: "#FEE500", color: "#191919", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.74 4.93 4.38 6.24l-1.12 4.12c-.1.36.32.64.64.44l4.84-3.2c.42.04.84.06 1.26.06 5.52 0 10-3.36 10-7.66C22 6.36 17.52 3 12 3z" fill="#191919"/></svg>
              카카오로 시작하기
            </button>
            <button className="social-btn" onClick={() => handleSocial('google')}
              style={{ ...btn, background: C.sf, color: C.tp, border: `1px solid ${C.bd}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google로 시작하기
            </button>
          </div>
        )}

        {/* Divider */}
        {mode !== 'forgot' && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: C.bd }} />
            <span style={{ fontSize: 12, color: C.tt }}>또는 이메일로</span>
            <div style={{ flex: 1, height: 1, background: C.bd }} />
          </div>
        )}

        {/* Email form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label htmlFor="login-email" style={{ fontSize: 12, fontWeight: 500, color: C.tt, display: 'block', marginBottom: 6 }}>이메일</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" style={is} autoComplete="email" required />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label htmlFor="login-pw" style={{ fontSize: 12, fontWeight: 500, color: C.tt, display: 'block', marginBottom: 6 }}>
                비밀번호
                {mode === 'signup' && <span style={{ color: C.tt, fontWeight: 400, marginLeft: 6 }}>(6자 이상)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input id="login-pw" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" style={{ ...is, paddingRight: 44 }} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 6 : undefined} />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.tt, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, minHeight: 36 }}>
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {/* Password strength indicator for signup */}
              {mode === 'signup' && password && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: C.bl }}>
                    <div style={{ width: `${(pwStrength.level / 3) * 100}%`, height: '100%', borderRadius: 2, background: pwStrength.color, transition: 'width .2s, background .2s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: pwStrength.color }}>{pwStrength.label}</span>
                </div>
              )}
            </div>
          )}

          {error && <div role="alert" style={{ fontSize: 12, color: C.dn, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8 }}>{error}</div>}
          {message && <div role="status" style={{ fontSize: 12, color: "#16A34A", padding: "8px 12px", background: "#F0FDF4", borderRadius: 8 }}>{message}</div>}

          <button type="submit" disabled={loading}
            style={{ ...btn, background: C.pr, color: "#fff", opacity: loading ? 0.5 : 1 }}>
            {loading ? '처리 중...' : mode === 'signup' ? '회원가입' : mode === 'forgot' ? '재설정 이메일 보내기' : '로그인'}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
          {mode === 'login' && (
            <>
              <div>
                <span style={{ color: C.ts }}>계정이 없으신가요? </span>
                <button className="link-btn" onClick={() => switchMode('signup')} style={{ color: C.ac, fontSize: 13, fontWeight: 600 }}>회원가입</button>
              </div>
              <button className="link-btn" onClick={() => switchMode('forgot')} style={{ color: C.tt, fontSize: 12 }}>비밀번호를 잊으셨나요?</button>
            </>
          )}
          {mode === 'signup' && (
            <div>
              <span style={{ color: C.ts }}>이미 계정이 있으신가요? </span>
              <button className="link-btn" onClick={() => switchMode('login')} style={{ color: C.ac, fontSize: 13, fontWeight: 600 }}>로그인</button>
            </div>
          )}
          {mode === 'forgot' && (
            <button className="link-btn" onClick={() => switchMode('login')} style={{ color: C.ac, fontSize: 13, fontWeight: 600 }}>← 로그인으로 돌아가기</button>
          )}
        </div>
      </div>
    </div>
  );
}
