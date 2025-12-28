import React, { useState } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';

const LoginScreen: React.FC<NavigationProps> = ({ onNavigate }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'login') {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user?.user_metadata?.onoboarding_completed) {
          onNavigate(Screen.DASHBOARD);
        } else {
          onNavigate(Screen.ONBOARDING);
        }
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onNavigate(Screen.DASHBOARD);
        } else {
          setMessage('Cadastro realizado! Verifique seu e-mail para confirmar (se necessário) ou faça login.');
          setAuthMode('login');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMsg = err.message;
      if (err.message === 'Invalid login credentials') errorMsg = 'E-mail ou senha inválidos.';
      if (err.message.includes('already registered')) errorMsg = 'Este e-mail já está cadastrado.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Top Bar */}
      <div className="flex-row justify-between" style={{ padding: '32px 16px 16px' }}>
        <button className="btn-icon">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button style={{ color: 'var(--primary-500)', fontWeight: 600, fontSize: '0.875rem' }}>
          Ajuda?
        </button>
      </div>

      {/* Hero Section */}
      <div className="flex-col items-center" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ width: '96px', height: '96px', marginBottom: '24px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--primary-200)', filter: 'blur(20px)', borderRadius: '50%' }}></div>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGbJt38XuQtsNsTxEecXE0qxGjp3m0HRLeCu8Cbc28XkuG6EDuytlthxKO8Tq4nyl4_n-2LdEBKtYe6njj_Co-gurr6YKhSBO7fPvFiQRo8G9olOu0pgqrRHwe0sLbHCxdq8anf7rocwxeVX-_DMhNCkNxTUstzMgi6AlgCFBY1_PmuJYiu0XKFzglVwR6BoQHkUwG-STiA2if9-5ppicxuh8gVeWzY0s-eO_b2chYdf5hEact5JyyfsxUbLz15GySUvM0hZuppg"
            alt="Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 10, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
          />
        </div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-900)', lineHeight: 1.2, marginBottom: '8px' }}>
          Concursos PMMG
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-500)' }}>
          Prepare-se para o sucesso. {authMode === 'login' ? 'Faça login' : 'Cadastre-se'} para continuar.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ display: 'flex', height: '48px', backgroundColor: 'var(--surface-100)', borderRadius: '12px', padding: '4px' }}>
          <button
            onClick={() => { setAuthMode('login'); setError(null); setMessage(null); }}
            style={{
              flex: 1,
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              backgroundColor: authMode === 'login' ? 'var(--surface-0)' : 'transparent',
              color: authMode === 'login' ? 'var(--primary-600)' : 'var(--text-500)',
              boxShadow: authMode === 'login' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Entrar
          </button>
          <button
            onClick={() => { setAuthMode('register'); setError(null); setMessage(null); }}
            style={{
              flex: 1,
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              backgroundColor: authMode === 'register' ? 'var(--surface-0)' : 'transparent',
              color: authMode === 'register' ? 'var(--primary-600)' : 'var(--text-500)',
              boxShadow: authMode === 'register' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Cadastrar
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {(error || message) && (
        <div style={{ padding: '0 24px 16px' }}>
          {error && (
            <div style={{ padding: '12px', backgroundColor: 'var(--error-light)', color: 'var(--error-dark)', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ padding: '12px', backgroundColor: 'var(--success-light)', color: 'var(--success-dark)', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="flex-col gap-4" style={{ padding: '0 24px 24px' }}>
        <div>
          <label style={{ display: 'block', paddingLeft: '4px', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-700)' }}>E-mail</label>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-400)' }}>mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                height: '56px',
                padding: '0 16px 0 48px',
                borderRadius: '12px',
                border: '1px solid var(--surface-200)',
                backgroundColor: 'var(--surface-0)',
                fontSize: '1rem',
                color: 'var(--text-900)',
                outline: 'none'
              }}
              placeholder="seu.email@exemplo.com"
              type="email"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', paddingLeft: '4px', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-700)' }}>Senha</label>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-400)' }}>lock</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                height: '56px',
                padding: '0 48px',
                borderRadius: '12px',
                border: '1px solid var(--surface-200)',
                backgroundColor: 'var(--surface-0)',
                fontSize: '1rem',
                color: 'var(--text-900)',
                outline: 'none'
              }}
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-400)' }}
            >
              <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
            </button>
          </div>
        </div>

        {authMode === 'login' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <a href="#" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none' }}>
              Esqueceu a senha?
            </a>
          </div>
        )}

        <button
          onClick={handleAuth}
          disabled={loading}
          className="btn-primary"
          style={{
            width: '100%',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
            fontSize: '1rem',
            boxShadow: 'var(--shadow-lg)',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '24px' }}>refresh</span>
          ) : (
            <>
              <span>{authMode === 'login' ? 'Acessar Plataforma' : 'Criar Conta'}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default LoginScreen;
