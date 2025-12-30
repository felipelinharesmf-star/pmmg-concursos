import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';

const SubscriptionScreen: React.FC<NavigationProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>('free');

    useEffect(() => {
        fetchCurrentPlan();
    }, []);

    const fetchCurrentPlan = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('user_profiles').select('subscription_plan').eq('id', user.id).single();
            if (data) setCurrentPlan(data.subscription_plan || 'free');
        }
    };

    const handleSubscribe = async (plan: 'monthly' | 'quarterly' | 'semiannual') => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    plan_type: plan,
                    return_url: window.location.origin
                }
            });

            if (error) throw error;

            // In production/standard flow, we use the init_point (checkout_url) returned by MP
            const paymentUrl = data.checkout_url;

            if (data && paymentUrl) {
                // Open Mercado Pago Checkout
                window.open(paymentUrl, '_self');
            } else {
                throw new Error('Link de pagamento não gerado');
            }
        } catch (error: any) {
            console.error('Error creating checkout:', error);

            // Simple user-friendly error message
            alert('Não foi possível iniciar o pagamento. Por favor, tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    const PlanCard = ({ title, price, planId, recommended = false }: { title: string, price: string, planId: 'monthly' | 'quarterly' | 'semiannual', recommended?: boolean }) => {
        const isCurrent = currentPlan === planId;
        return (
            <div className={`relative p-6 rounded-2xl border ${recommended ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark'} shadow-sm flex flex-col gap-4`}>
                {recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Recomendado
                    </div>
                )}
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                        <span className="text-sm font-medium text-gray-500">R$</span>
                        <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{price}</span>
                        <span className="text-sm font-medium text-gray-500">/mês</span>
                    </div>
                </div>

                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        Questões Ilimitadas
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        Sem Anúncios
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        Estatísticas Avançadas
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        Ranking Global
                    </li>
                </ul>

                <button
                    onClick={() => handleSubscribe(planId)}
                    disabled={loading || isCurrent}
                    className={`w-full py-3 px-4 rounded-xl font-bold transition-all ${isCurrent
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md active:scale-95'
                        }`}
                >
                    {loading ? 'Processando...' : isCurrent ? 'Plano Atual' : 'Assinar Agora'}
                </button>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark overflow-hidden">
            {/* Header - Standardized */}
            <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center px-4 h-14 justify-between">
                    <button
                        onClick={() => onNavigate(Screen.SETTINGS)}
                        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-slate-900 dark:text-white">Planos Premium</h2>
                    <div className="w-10"></div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-5 pb-24">
                <div className="w-full space-y-8">

                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Desbloqueie todo o potencial</h1>
                        <p className="text-gray-500 dark:text-gray-400">Estude sem limites e alcance sua aprovação mais rápido.</p>
                    </div>

                    <div className="space-y-4">
                        <PlanCard
                            title="Semestral"
                            price="19,90"
                            planId="semiannual"
                            recommended={true}
                        />
                        <PlanCard
                            title="Trimestral"
                            price="24,90"
                            planId="quarterly"
                        />
                        <PlanCard
                            title="Mensal"
                            price="29,90"
                            planId="monthly"
                        />
                    </div>

                    <div className="bg-gray-50 dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">No plano Grátis você tem:</h3>
                        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <li className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">check_circle</span>
                                10 Questões por dia
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">check_circle</span>
                                Estatísticas Básicas
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-[20px]">block</span>
                                <span className="line-through opacity-50">Ranking Global</span>
                            </li>
                        </ul>
                    </div>

                    <p className="text-center text-xs text-gray-400">
                        Pagamento único. Acesso imediato via PIX ou Cartão. Sem renovação automática surpresa.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default SubscriptionScreen;
