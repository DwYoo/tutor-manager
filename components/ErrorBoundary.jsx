'use client';
import { Component } from 'react';
import { C } from '@/components/Colors';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          flexDirection: 'column',
          gap: 16,
          padding: 24
        }}>
          <div style={{ fontSize: 48 }}>&#9888;</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tp }}>
            오류가 발생했습니다
          </h2>
          <p style={{ fontSize: 14, color: C.ts, textAlign: 'center' }}>
            페이지를 새로고침해 주세요.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: C.ac,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
