import React, { useEffect, useState, useRef } from 'react';
import { NavigationProps, Screen, Notice } from '../types';
import { supabase } from '../lib/supabase';

const DashboardScreen: React.FC<NavigationProps> = ({ onNavigate }) => {
  const [userName, setUserName] = useState('Guerreiro');
  const [targetExam, setTargetExam] = useState('PMMG');
  const [performance, setPerformance] = useState<{ percentage: number; total: number }>({ percentage: 0, total: 0 });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free');
  const [notices, setNotices] = useState<Notice[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let currentTargetExam = 'CFS';

        if (user.user_metadata) {
          if (user.user_metadata.full_name) setUserName(user.user_metadata.full_name);
          if (user.user_metadata.target_exam) {
            setTargetExam(user.user_metadata.target_exam);
            currentTargetExam = user.user_metadata.target_exam;
          }
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, target_exam, avatar_url, subscription_plan, display_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.display_name) setUserName(profile.display_name);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
          if (profile.subscription_plan) setSubscriptionPlan(profile.subscription_plan);

          if (profile.target_exam !== currentTargetExam) {
            await supabase.from('user_profiles').update({ target_exam: currentTargetExam }).eq('id', user.id);
          }
        } else {
          await supabase.from('user_profiles').upsert({
            id: user.id,
            display_name: userName,
            target_exam: currentTargetExam,
            is_public: false,
            subscription_plan: 'free'
          });
        }

        const { data: answers } = await supabase
          .from('user_answers')
          .select('is_correct, created_at')
          .eq('user_id', user.id);


        if (answers && answers.length > 0) {
          const correct = answers.filter((a: any) => a.is_correct).length;
          const total = answers.length;
          setPerformance({
            percentage: Math.round((correct / total) * 100),
            total: total
          });


        }



        const { data: percentileData, error: percentileError } = await supabase.rpc('get_user_percentile');
        if (!percentileError && percentileData !== null) setPercentile(percentileData);

        // Fetch Notices
        const { data: noticesData } = await supabase
          .from('notices')
          .select('*')
          .eq('active', true)
          .order('priority', { ascending: false });

        if (noticesData) setNotices(noticesData);
      }
    };
    getUserData();
  }, []);

  // ... (rest of the file)



  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}`;
      const filePath = `${fileName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-background-light dark:bg-background-dark">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-20">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full bg-cover bg-center border-2 border-primary-100 dark:border-gray-700 shadow-sm"
              style={{
                backgroundImage: `url("${avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAG1JRpW-MOblJm1eR4ShxoLKdJTJNQAE9jBTEyKk2oiN8skbt5HtYgjKTbiJLLOQOncaqQgOaDk_VYWE6rIhJB0Sr1XHzUWWhs5FEYubZhlUkgErlRqE38Mtxp8m9kwofDQJP4kU2YC7qwrP710QjOcRMNGteP3gNEfwr3VeaRqiM1AXeZuEnZwEz7gc661jaC_FIyP2TEju1-NPGCa4ejuA8gzVMbL4yqAD5t2s4yJGKZWGEhoTB6aBziyG7Zbk1_vMk7lwJ4HA'}")`
              }}
            />
            <div className="flex flex-col justify-center gap-0.5">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">{userName}</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Concurso {targetExam}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 relative group">
              <span className="material-symbols-outlined text-[24px] group-active:scale-95 transition-transform">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-background-light dark:border-background-dark rounded-full"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 space-y-6">

        {/* Desempenho Card */}
        <section className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">analytics</span>
              Desempenho Geral
            </h2>
            <button
              onClick={() => onNavigate(Screen.PERFORMANCE)}
              className="text-xs font-bold text-primary hover:text-primary-700 flex items-center gap-1"
            >
              Detalhes <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-1">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{performance.percentage}%</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">de acertos</span>
            </div>

            <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${performance.percentage}%` }}
              />
            </div>

            <div className="flex items-start gap-2 mt-1">
              <span className="material-symbols-outlined text-gray-400 text-[16px] mt-0.5">leaderboard</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {percentile !== null && percentile > 0 ? (
                  <>Você está no top <strong className="text-gray-900 dark:text-white">{percentile}%</strong> dos candidatos.</>
                ) : (
                  'Resolva mais questões para ver sua posição no ranking.'
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Premium Banner */}
        {subscriptionPlan === 'free' && (
          <div
            onClick={() => onNavigate(Screen.SUBSCRIPTION)}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-5 shadow-lg shadow-primary/25 cursor-pointer group"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Seja Premium
                  <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">PRO</span>
                </h3>
                <p className="text-white/90 text-xs font-medium max-w-[200px]">
                  Desbloqueie questões ilimitadas, ranking global e muito mais.
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <span className="material-symbols-outlined text-white text-[24px]">diamond</span>
              </div>
            </div>

            {/* Decorative circles */}
            <div className="absolute -right-4 -top-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-4 -bottom-8 w-24 h-24 rounded-full bg-purple-500/20 blur-xl" />
          </div>
        )}

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate(Screen.FILTER)}
            className="flex flex-col items-center justify-center gap-3 bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">assignment_add</span>
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Novo Simulado</span>
          </button>

          <button
            onClick={() => onNavigate(Screen.FILTER, { context: 'bookmarks' })}
            className="flex flex-col items-center justify-center gap-3 bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">bookmark</span>
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Questões para Revisão</span>
          </button>
        </section>

        {/* Notice Board */}
        <NoticeBoard notices={notices} />

      </main>
    </div >
  );
};

// Internal Notice Board Component
const NoticeBoard: React.FC<{ notices: import('../types').Notice[] }> = ({ notices }) => {
  if (!notices || notices.length === 0) return null;

  return (
    <section className="mt-2 mb-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">campaign</span>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Quadro de Avisos</h3>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-4 -mx-4 px-4 scrollbar-hide snap-x">
        {notices.map((notice) => (
          <a
            key={notice.id}
            href={notice.action_url || '#'}
            target={notice.action_url?.startsWith('http') ? '_blank' : '_self'}
            className={`flex-shrink-0 w-72 snap-center rounded-2xl p-4 border relative overflow-hidden transition-all active:scale-95 ${notice.type === 'promo'
              ? 'bg-gradient-to-br from-primary-600 to-indigo-700 border-transparent text-white shadow-lg shadow-primary/20'
              : 'bg-surface-light dark:bg-surface-dark border-gray-200 dark:border-gray-800 shadow-sm'
              }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${notice.type === 'promo'
                ? 'bg-white/20 text-white'
                : notice.type === 'exam'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                {notice.type === 'news' ? 'Notícia' : notice.type === 'exam' ? 'Concurso' : notice.type === 'promo' ? 'Promoção' : 'Atualização'}
              </span>
              {notice.type === 'promo' && <span className="material-symbols-outlined text-white/50 text-[18px]">star</span>}
            </div>

            <h4 className={`font-bold text-sm mb-1 line-clamp-2 ${notice.type === 'promo' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {notice.title}
            </h4>

            {notice.description && (
              <p className={`text-xs line-clamp-2 ${notice.type === 'promo' ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {notice.description}
              </p>
            )}

            <div className="mt-3 flex items-center gap-1 text-xs font-bold">
              <span className={notice.type === 'promo' ? 'text-white' : 'text-primary'}>Saiba mais</span>
              <span className={`material-symbols-outlined text-[14px] ${notice.type === 'promo' ? 'text-white' : 'text-primary'}`}>arrow_forward</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default DashboardScreen;
