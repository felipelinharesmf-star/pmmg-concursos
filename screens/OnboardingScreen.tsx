import React, { useState } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';

const OnboardingScreen: React.FC<NavigationProps> = ({ onNavigate }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [exam, setExam] = useState('CFS'); // Default
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Por favor, informe seu nome.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    full_name: name,
                    phone: phone,
                    target_exam: exam,
                    onoboarding_completed: true
                }
            });

            if (updateError) throw updateError;

            onNavigate(Screen.DASHBOARD);
        } catch (err: any) {
            console.error('Error updating user:', err);
            setError('Erro ao salvar dados. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-50">
            <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-text-900 mb-2">Bem-vindo!</h1>
                    <p className="text-text-500">Vamos personalizar sua experiência de estudos.</p>
                </div>

                <div className="flex flex-col gap-5 bg-white p-6 rounded-2xl shadow-sm border border-surface-200">

                    {error && (
                        <div className="p-3 bg-error-light text-error-dark text-sm font-medium rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-700 mb-1.5">Como gostaria de ser chamado?</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Sd Silva"
                            className="w-full h-12 px-4 rounded-xl border border-surface-200 bg-surface-50 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-700 mb-1.5">Telefone (Opcional)</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(31) 99999-9999"
                            className="w-full h-12 px-4 rounded-xl border border-surface-200 bg-surface-50 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-700 mb-1.5">Qual concurso você está focando?</label>
                        <div className="relative">
                            <select
                                value={exam}
                                onChange={(e) => setExam(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-surface-200 bg-surface-50 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all appearance-none"
                            >
                                <option value="CFS">CFS</option>
                                <option value="CHO">CHO</option>
                                <option value="EAP - 1º TEN">EAP - 1º TEN</option>
                                <option value="EAP - 1º SGT">EAP - 1º SGT</option>
                                <option value="EAP - 3º SGT">EAP - 3º SGT</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-400 pointer-events-none">
                                expand_more
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn-primary" // Using the class that likely exists from index.css or global styles as seen in LoginScreen
                        style={{
                            marginTop: '16px',
                            width: '100%',
                            height: '48px',
                            backgroundColor: 'var(--primary-600)',
                            color: 'white',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '24px' }}>refresh</span>
                        ) : (
                            <>
                                <span>Começar a Estudar</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingScreen;
