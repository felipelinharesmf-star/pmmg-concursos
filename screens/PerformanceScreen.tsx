import React, { useEffect, useState } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PerformanceScreen: React.FC<NavigationProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{ subject: string; correct: number; total: number }[]>([]);
    const [ranking, setRanking] = useState<{ position: number; name: string; score: number; isMe: boolean; isPublic: boolean }[]>([]);
    const [userProfile, setUserProfile] = useState<{ id: string; display_name: string; is_public: boolean } | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [uiError, setUiError] = useState<string | null>(null);

    // Chart State
    const [chartData, setChartData] = useState<{ name: string; val: number }[]>([]);
    const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'all'>('weekly');
    const [selectedSubjectChart, setSelectedSubjectChart] = useState<string>('all');

    const [allAnswers, setAllAnswers] = useState<any[]>([]);

    useEffect(() => {
        fetchPerformanceData();
    }, []);

    // Re-process chart when filters or data change
    useEffect(() => {
        if (allAnswers.length > 0) {
            processChartData(allAnswers);
        } else {
            setChartData([]);
        }
    }, [allAnswers, timeRange, selectedSubjectChart]);

    const fetchPerformanceData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch User Profile
            let profile = null;
            try {
                const { data: profiles, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', user.id);

                if (!profileError && profiles && profiles.length > 0) {
                    profile = profiles[0];
                } else if (profileError && profileError.code !== 'PGRST116') {
                    console.warn("Profile fetch error:", profileError);
                }
            } catch (e) {
                console.warn("Exception fetching profile:", e);
            }

            const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';

            if (!profile) {
                try {
                    const { data: upserted, error: upsertError } = await supabase
                        .from('user_profiles')
                        .upsert({ id: user.id, display_name: fullName, is_public: false }, { onConflict: 'id', ignoreDuplicates: true })
                        .select().single();
                    if (!upsertError) profile = upserted;
                } catch (e) { console.warn(e); }
                if (!profile) profile = { id: user.id, display_name: fullName, is_public: false };
            } else if (profile.display_name !== fullName && user.user_metadata?.full_name) {
                await supabase.from('user_profiles').update({ display_name: fullName }).eq('id', user.id);
                profile.display_name = fullName;
            }

            setUserProfile(profile);

            // 2. Fetch all user answers
            const { data: answers, error: answersError } = await supabase
                .from('user_answers')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (answersError) {
                throw new Error("Falha ao carregar respostas. " + answersError.message);
            }

            if (answers) {
                setAllAnswers(answers); // Store for local filtering

                const subjectMap = new Map<string, { correct: number; total: number }>();
                answers.forEach((ans: any) => {
                    const current = subjectMap.get(ans.subject) || { correct: 0, total: 0 };
                    subjectMap.set(ans.subject, {
                        correct: current.correct + (ans.is_correct ? 1 : 0),
                        total: current.total + 1
                    });
                });
                const statsArray = Array.from(subjectMap.entries()).map(([subject, data]) => ({
                    subject: subject || 'Geral',
                    correct: data.correct,
                    total: data.total,
                    percentage: Math.round((data.correct / data.total) * 100)
                }));
                // Sort by percentage descending
                setStats(statsArray.sort((a, b) => b.percentage - a.percentage));
            }

            // 3. Ranking
            const { data: rankingData, error: rankingError } = await supabase.rpc('get_ranking');

            if (rankingError) {
                console.error("Ranking error:", rankingError);
                if (answers) {
                    const totalCorrect = answers.filter((a: any) => a.is_correct).length;
                    const total = answers.length;
                    const score = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
                    setRanking([{ position: 1, name: 'Você', score, isMe: true, isPublic: false }]);
                }
            } else if (rankingData) {
                const amIPublic = profile?.is_public || false;
                const processed = rankingData.map((item: any, index: number) => {
                    const isMe = item.user_id === user.id;
                    const isItemPublic = item.is_public;
                    let displayName = item.display_name;
                    if (!amIPublic && !isMe) displayName = '*****';
                    else if (amIPublic && !isItemPublic && !isMe) displayName = 'Anônimo';

                    return {
                        position: index + 1,
                        name: isMe ? `${displayName} (Você)` : displayName,
                        score: item.score,
                        isMe,
                        isPublic: isItemPublic
                    };
                });
                setRanking(processed);
            }

        } catch (err: any) {
            console.error('Fetch Error:', err);
            setUiError(err.message || "Erro desconhecido ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    // Check if user is premium
    const isPremium = userProfile?.subscription_plan && ['monthly', 'quarterly', 'semiannual'].includes(userProfile.subscription_plan);

    const PremiumLock = () => (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/5 dark:bg-black/30 rounded-2xl overflow-hidden transition-all duration-300">
            <div className="relative z-10 flex flex-col items-center p-1 text-center animate-in fade-in zoom-in-95 duration-500 delay-100">
                <span className="material-symbols-outlined text-white text-xl mb-0.5 drop-shadow-md">lock</span>

                <h3 className="text-[10px] font-black tracking-wide text-white mb-1.5 drop-shadow-md uppercase">
                    Conteúdo Premium
                </h3>

                <button
                    onClick={() => onNavigate(Screen.SUBSCRIPTION)}
                    className="px-2.5 py-1 bg-white text-slate-900 font-bold text-[10px] leading-none rounded-lg shadow-md hover:scale-105 transition-transform active:scale-95 flex items-center gap-1"
                >
                    <span>ASSINE AGORA</span>
                </button>
            </div>
        </div>
    );

    const processChartData = (data: any[]) => {
        let filtered = selectedSubjectChart === 'all'
            ? data
            : data.filter((a: any) => a.subject === selectedSubjectChart);

        const now = new Date();
        const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
        const oneMonthAgo = new Date(); oneMonthAgo.setMonth(now.getMonth() - 1);

        if (timeRange === 'weekly') {
            filtered = filtered.filter((a: any) => new Date(a.created_at) >= oneWeekAgo);
        } else if (timeRange === 'monthly') {
            filtered = filtered.filter((a: any) => new Date(a.created_at) >= oneMonthAgo);
        }

        const grouped = new Map<string, { correct: number, total: number }>();

        filtered.forEach((a: any) => {
            const date = new Date(a.created_at);
            let key = '';

            if (timeRange === 'weekly') {
                const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
                key = days[date.getDay()];
            } else {
                key = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }

            const current = grouped.get(key) || { correct: 0, total: 0 };
            grouped.set(key, {
                correct: current.correct + (a.is_correct ? 1 : 0),
                total: current.total + 1
            });
        });

        const chartArray = Array.from(grouped.entries()).map(([name, val]) => ({
            name,
            val: Math.round((val.correct / val.total) * 100)
        }));

        setChartData(chartArray);
    };

    const togglePrivacy = async () => {
        if (!userProfile) return;
        try {
            const newValue = !userProfile.is_public;
            setUserProfile({ ...userProfile, is_public: newValue });
            const { error } = await supabase.from('user_profiles').update({ is_public: newValue }).eq('id', userProfile.id);
            if (!error) setRefreshTrigger(p => p + 1);
            else {
                setUserProfile({ ...userProfile, is_public: !newValue });
                alert('Erro ao atualizar privacidade');
            }
        } catch (err) { console.error(err); }
    };

    const getPerformanceColor = (percentage: number) => {
        if (percentage >= 80) return 'var(--success-main)';
        if (percentage >= 60) return 'var(--warning-main)';
        return 'var(--error-main)';
    };

    if (uiError) {
        return (
            <div style={{ flex: 1, padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ backgroundColor: 'var(--error-light)', border: '1px solid var(--error-main)', padding: '16px', borderRadius: '8px', color: 'var(--error-dark)', textAlign: 'center' }}>
                    <strong>Ops! Algo deu errado.</strong>
                    <p style={{ marginTop: '8px', fontSize: '0.875rem' }}>{uiError}</p>
                    <p style={{ marginTop: '4px', fontSize: '0.75rem' }}>Verifique se o script SQL foi executado.</p>
                </div>
                <button
                    onClick={() => onNavigate(Screen.DASHBOARD)}
                    className="btn-primary"
                    style={{ marginTop: '16px' }}
                >
                    Voltar para o Início
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white pb-24">
            {/* Header Sticky */}
            <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center px-4 h-14 justify-between">
                    <button
                        onClick={() => onNavigate(Screen.DASHBOARD)}
                        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Desempenho Detalhado</h2>
                </div>
            </div>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-5 pb-24 space-y-6">

                {/* 1. Privacy Section */}
                <section className="relative" style={{ width: '100%', backgroundColor: 'var(--primary-50)', borderRadius: '16px', padding: '20px', border: '1px solid var(--primary-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {!isPremium && <PremiumLock />}
                    <div className={!isPremium ? 'opacity-90 pointer-events-none select-none filter blur-[0.5px] w-full flex justify-between items-center transition-all duration-500' : 'w-full flex justify-between items-center'}>
                        <div>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-900)' }}>Ranking Público</h3>
                            <p style={{ fontSize: '0.75rem', marginTop: '4px', color: userProfile?.is_public ? 'var(--success-dark)' : 'var(--primary-700)' }}>
                                {userProfile?.is_public ? 'Você está participando visivelmente.' : 'Ative para ver e ser visto no ranking.'}
                            </p>
                        </div>
                        <div
                            onClick={togglePrivacy}
                            style={{
                                width: '48px', height: '24px',
                                backgroundColor: userProfile?.is_public ? 'var(--primary-600)' : 'var(--surface-200)',
                                borderRadius: '99px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
                            }}
                        >
                            <div style={{
                                width: '18px', height: '18px',
                                backgroundColor: 'white', borderRadius: '50%',
                                position: 'absolute', top: '3px',
                                left: userProfile?.is_public ? '27px' : '3px',
                                transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }} />
                        </div>
                    </div>
                </section>

                {/* 2. Ranking Card */}
                <section className="relative" style={{ width: '100%', backgroundColor: 'var(--surface-0)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--surface-200)' }}>
                    {!isPremium && <PremiumLock />}
                    <div className={!isPremium ? 'opacity-80 pointer-events-none select-none blur-[0px] transition-all duration-500' : ''}>
                        <div className="flex-row items-center gap-2 mb-4">
                            <span className="material-symbols-outlined" style={{ color: '#eab308' }}>emoji_events</span>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-900)' }}>Ranking Geral</h2>
                        </div>
                        <div className="flex-col gap-3">
                            {ranking.length === 0 && !loading && (
                                <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-500)' }}>Nenhum dado disponível.</p>
                            )}
                            {ranking.map((item) => (
                                <div
                                    key={item.position}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '12px',
                                        backgroundColor: item.isMe ? 'var(--primary-50)' : 'var(--surface-50)',
                                        border: item.isMe ? '1px solid var(--primary-200)' : 'none'
                                    }}
                                >
                                    <div className="flex-row items-center gap-3">
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700,
                                            backgroundColor: item.position <= 3 ? '#fef9c3' : 'var(--surface-200)',
                                            color: item.position <= 3 ? '#a16207' : 'var(--text-500)'
                                        }}>
                                            {item.position}º
                                        </div>
                                        <span style={{ fontSize: '0.875rem', fontWeight: item.isMe ? 700 : 400, color: item.isMe ? 'var(--primary-700)' : 'var(--text-700)' }}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-900)' }}>{item.score}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. Stats by Subject */}
                <section className="relative flex-col gap-4">
                    {!isPremium && <PremiumLock />}
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-900)' }}>Desempenho por Matéria</h2>
                    <div className={!isPremium ? 'opacity-80 pointer-events-none select-none blur-[0px] transition-all duration-500' : ''}>
                        {loading && stats.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-500)', padding: '20px' }}>Carregando...</div>
                        ) : stats.length === 0 ? (
                            <div style={{ backgroundColor: 'var(--surface-0)', padding: '24px', borderRadius: '16px', border: '1px solid var(--surface-200)', textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-500)' }}>Sem dados suficientes.</p>
                            </div>
                        ) : (
                            stats.map((stat) => {
                                const pct = Math.round((stat.correct / stat.total) * 100);
                                const barColor = getPerformanceColor(pct);
                                return (
                                    <div key={stat.subject} style={{ backgroundColor: 'var(--surface-0)', padding: '16px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--surface-200)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-700)' }}>{stat.subject}</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: barColor }}>{pct}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--surface-100)', borderRadius: '99px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '99px', transition: 'width 0.5s' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-500)' }}>
                                            <span>{stat.correct} acertos</span>
                                            <span>{stat.total} questões</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* 4. Evolution Chart */}
                <section className="relative" style={{ width: '100%', backgroundColor: 'var(--surface-0)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--surface-200)' }}>
                    {!isPremium && <PremiumLock />}
                    <div className={!isPremium ? 'opacity-80 pointer-events-none select-none blur-[0px] transition-all duration-500' : ''}>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div className="flex-row items-center gap-2">
                                    <span className="material-symbols-outlined" style={{ color: 'var(--primary-500)' }}>show_chart</span>
                                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-900)' }}>Evolução</h2>
                                </div>
                                {/* Period Filter */}
                                <div style={{ display: 'flex', backgroundColor: 'var(--surface-100)', borderRadius: '8px', padding: '4px' }}>
                                    {['weekly', 'monthly', 'all'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => { setTimeRange(t as any); }}
                                            style={{
                                                padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px',
                                                backgroundColor: timeRange === t ? 'var(--surface-0)' : 'transparent',
                                                color: timeRange === t ? 'var(--primary-600)' : 'var(--text-500)',
                                                boxShadow: timeRange === t ? 'var(--shadow-sm)' : 'none'
                                            }}
                                        >
                                            {t === 'weekly' ? 'Sem' : t === 'monthly' ? 'Mês' : 'Geral'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Subject Select */}
                            <select
                                value={selectedSubjectChart}
                                onChange={(e) => { setSelectedSubjectChart(e.target.value); }}
                                style={{
                                    width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--surface-200)',
                                    backgroundColor: 'var(--surface-50)', color: 'var(--text-700)', fontSize: '0.875rem', outline: 'none'
                                }}
                            >
                                <option value="all">Todas as Matérias</option>
                                {stats.map(s => <option key={s.subject} value={s.subject}>{s.subject}</option>)}
                            </select>
                        </div>
                        <div style={{ width: '100%', height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis
                                        dataKey="name"
                                        stroke="var(--text-500)"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--surface-0)', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                                        cursor={{ fill: 'var(--surface-100)' }}
                                    />
                                    <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.val >= 70 ? 'var(--success-main)' : entry.val >= 50 ? 'var(--warning)' : 'var(--error-main)'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {chartData.length === 0 && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-400)', fontSize: '0.875rem' }}>
                                    Sem dados.
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};


export default PerformanceScreen;
