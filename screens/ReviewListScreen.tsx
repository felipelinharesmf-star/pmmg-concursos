import React, { useEffect, useState } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';

interface WrongAnswer {
    id: number; // user_answers id
    question_id: number;
    subject: string;
    created_at: string;
    question_details?: any;
}

const ReviewListScreen: React.FC<NavigationProps> = ({ onNavigate }) => {
    const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchErrors = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch wrong answers
                    const { data: answers, error } = await supabase
                        .from('user_answers')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('is_correct', false)
                        .order('created_at', { ascending: false });

                    if (answers) {
                        // For each wrong answer, we'd ideally fetch question text.
                        // Since we can't easily join cross-schema or unstructured tables efficiently without setup,
                        // we will fetch the question texts in a second step or just list them by ID/Subject first.
                        // Let's try to fetch details for the unique question IDs.
                        const questionIds = Array.from(new Set(answers.map(a => a.question_id)));

                        if (questionIds.length > 0) {
                            const { data: questions } = await supabase
                                .from('questões crs')
                                .select('ID, Enunciado, Matéria')
                                .in('ID', questionIds);

                            const questionMap = new Map(questions?.map(q => [q.ID, q]));

                            const combined = answers.map(a => ({
                                ...a,
                                question_details: questionMap.get(a.question_id)
                            }));
                            setWrongAnswers(combined);
                        } else {
                            setWrongAnswers(answers);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching errors:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchErrors();
    }, []);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-50)' }}>
            {/* Header */}
            <header className="app-header">
                <button
                    onClick={() => onNavigate(Screen.DASHBOARD)}
                    className="btn-icon"
                >
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                </button>
                <h2 className="header-title">Revisar Erros</h2>
                <div style={{ width: 40 }}></div>
            </header>

            <main style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <span className="material-symbols-outlined animate-spin text-4xl mb-2">refresh</span>
                        <p>Carregando erros...</p>
                    </div>
                ) : wrongAnswers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <span className="material-symbols-outlined text-6xl text-green-500 mb-4">check_circle</span>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Sem erros pendentes!</h3>
                        <p className="text-gray-500">Parabéns! Você não tem questões erradas para revisar no momento.</p>
                        <button
                            onClick={() => onNavigate(Screen.FILTER)}
                            className="btn-primary mt-6"
                        >
                            Novo Simulado
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {wrongAnswers.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                            // For now we don't have a direct "Go to specific question ID" in QuestionScreen, 
                            // but we can implement it later or pass filters.
                            // Let's assume we want to just see the list for this task,
                            // or we can navigate to Filter with specific ID if supported.
                            // For now, let's just show it.
                            // Ideally: onClick={() => onNavigate(Screen.QUESTION, { questionId: item.question_id })}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full uppercase tracking-wider">
                                        {item.subject || 'Geral'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900 line-clamp-3 mb-2">
                                    {item.question_details?.Enunciado || 'Carregando enunciado...'}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-error-600 font-semibold">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                    <span>Errou</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ReviewListScreen;
