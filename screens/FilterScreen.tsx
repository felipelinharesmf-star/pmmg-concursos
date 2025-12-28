import React, { useState } from 'react';
import { NavigationProps, Screen, FilterParams } from '../types';
import { supabase } from '../lib/supabase';

const FilterScreen: React.FC<NavigationProps> = ({ onNavigate, params }) => {
    const isBookmarksContext = params?.context === 'bookmarks';

    const [discipline, setDiscipline] = useState('');
    const [source, setSource] = useState(''); // Fonte_documento
    const [exam, setExam] = useState(''); // Prova
    const [searchText, setSearchText] = useState(''); // New: Text Search
    const [limit, setLimit] = useState(20); // Default limit

    const [onlyNotAnswered, setOnlyNotAnswered] = useState(false);
    const [onlyWrong, setOnlyWrong] = useState(false);

    // Options state
    const [disciplines, setDisciplines] = useState<string[]>([]);
    const [sources, setSources] = useState<string[]>([]);
    const [exams, setExams] = useState<string[]>([]);
    const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);

    React.useEffect(() => {
        const fetchInitialOptions = async () => {
            try {
                let bookmarkedIds: number[] = [];

                // If in bookmarks context, fetch the bookmarked IDs first
                if (isBookmarksContext) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: bookmarks } = await supabase
                            .from('user_bookmarks')
                            .select('question_id')
                            .eq('user_id', user.id);

                        if (bookmarks) {
                            bookmarkedIds = bookmarks.map(b => b.question_id);
                            setBookmarkCount(bookmarks.length);
                        } else {
                            setBookmarkCount(0);
                        }
                    }
                }

                // Helper to apply bookmark filter
                const applyBookmarkFilter = (query: any) => {
                    if (isBookmarksContext) {
                        if (bookmarkedIds.length > 0) {
                            return query.in('ID', bookmarkedIds);
                        } else {
                            // Force empty if bookmarks context but no IDs
                            return query.in('ID', [0]);
                        }
                    }
                    return query;
                };

                // 1. Matéria (Disciplina)
                let dQuery = supabase.from('questões crs').select('Matéria');
                dQuery = applyBookmarkFilter(dQuery);
                const { data: dData, error: dError } = await dQuery;

                if (dError) console.error('Error fetching disciplines:', dError);
                if (dData) {
                    const unique = [...new Set(dData.map((i: any) => i.Matéria || i.materia || i.Materia))].filter(Boolean).sort();
                    setDisciplines(unique);
                }

                // 3. Prova
                let pQuery = supabase.from('questões crs').select('Prova');
                pQuery = applyBookmarkFilter(pQuery);
                const { data: pData, error: pError } = await pQuery;

                if (pError) console.error('Error fetching exams:', pError);
                if (pData) {
                    const unique = [...new Set(pData.map((i: any) => i.Prova || i.prova))].filter(Boolean).sort();
                    setExams(unique);
                }
            } catch (err) {
                console.error('Unexpected error fetching initial options:', err);
            }
        };
        fetchInitialOptions();
    }, [isBookmarksContext]);

    // Fetch Sources dependent on Discipline (and Bookmarks)
    React.useEffect(() => {
        const fetchSources = async () => {
            // We need to re-fetch bookmarks IDs or store them in state to avoid double fetching?
            // For simplicity, let's just re-fetch or assume checking against the same restriction logic if we moved it out.
            // Actually, it's better to verify user bookmarks again or use a ref. 
            // To solve this cleanly, let's duplicate the logic slightly or use a wider scope state, 
            // but `useEffect` separation makes sharing state harder without refactoring.
            // Let's doing the fetch inside here too for safety/simplicity given the scale.

            try {
                let bookmarkedIds: number[] = [];
                if (isBookmarksContext) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: bookmarks } = await supabase
                            .from('user_bookmarks')
                            .select('question_id')
                            .eq('user_id', user.id);
                        if (bookmarks) bookmarkedIds = bookmarks.map(b => b.question_id);
                    }
                }

                let query = supabase.from('questões crs').select('Fonte_documento');

                if (discipline) {
                    query = query.eq('Matéria', discipline);
                }

                if (isBookmarksContext) {
                    if (bookmarkedIds.length === 0) {
                        setSources([]);
                        return;
                    }
                    query = query.in('ID', bookmarkedIds);
                }

                const { data: sData, error: sError } = await query;
                if (sError) console.error('Error fetching sources:', sError);

                if (sData) {
                    const unique = [...new Set(sData.map((i: any) => i.Fonte_documento || i.fonte_documento || i.Fonte))].filter(Boolean).sort();
                    setSources(unique);
                }
            } catch (err) {
                console.error('Unexpected error fetching sources:', err);
            }
        };

        // Reset source when discipline changes
        setSource('');
        fetchSources();
    }, [discipline, isBookmarksContext]);

    const [matchingCount, setMatchingCount] = useState<number | null>(null);

    // Subscription Check
    const [isPremium, setIsPremium] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    React.useEffect(() => {
        const checkPremium = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('user_profiles').select('subscription_plan').eq('id', user.id).single();
                if (profile && ['monthly', 'quarterly', 'semiannual'].includes(profile.subscription_plan)) {
                    setIsPremium(true);
                }
            }
        };
        checkPremium();
    }, []);

    // Fetch Count Effect
    React.useEffect(() => {
        const fetchMatchingCount = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                const rpcParams = {
                    p_discipline: discipline || null,
                    p_source: source || null,
                    p_exam: exam || null,
                    p_search_text: searchText.length > 0 ? searchText : null,
                    p_user_id: user?.id || null,
                    p_only_wrong: onlyWrong,
                    p_only_not_answered: onlyNotAnswered
                };

                const { data, error } = await supabase.rpc('get_questions_count', rpcParams);

                if (error) {
                    console.error('Error fetching count:', error);
                } else {
                    setMatchingCount(data);
                }
            } catch (err) {
                console.error('Exception fetching count:', err);
            }
        };

        // Debounce slightly to avoid too many requests while typing
        const timeoutId = setTimeout(() => {
            fetchMatchingCount();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [discipline, source, exam, searchText, onlyNotAnswered, onlyWrong]);

    const handleApplyFilters = () => {
        const filters: FilterParams = {
            discipline,
            source,
            exam,
            onlyNotAnswered,
            onlyWrong,
            searchText: searchText.trim() || undefined,
            onlyBookmarks: isBookmarksContext || undefined
        };
        onNavigate(Screen.QUESTION, { ...filters, limit });
    };

    const handleClearFilters = () => {
        setDiscipline('');
        setSource('');
        setExam('');
        setSearchText('');
        setOnlyNotAnswered(false);
        setOnlyWrong(false);
        setLimit(20);
    };

    const selectClassName = "w-full rounded-xl border border-gray-300 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] text-gray-900 dark:text-white h-14 pl-4 pr-10 focus:border-primary focus:ring-primary text-base appearance-none outline-none bg-none";
    const inputClassName = "w-full rounded-xl border border-gray-300 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] text-gray-900 dark:text-white h-14 px-4 focus:border-primary focus:ring-primary text-base outline-none";

    return (
        <div className="relative flex min-h-full w-full flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center px-4 h-14 justify-between">
                    <button
                        onClick={() => onNavigate(Screen.DASHBOARD)}
                        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">
                        {isBookmarksContext ? 'Filtrar Revisão' : 'Filtro de Questões'}
                    </h2>
                    <div className="flex w-10 items-center justify-end">
                        <button
                            onClick={handleClearFilters}
                            className="text-primary text-sm font-bold"
                        >
                            Limpar
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 pb-4 w-full px-4">
                {/* Bookmark Count Message */}
                {isBookmarksContext && bookmarkCount !== null && (
                    <div className="px-4 pt-4">
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-center gap-3">
                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">bookmark</span>
                            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                Você possui <strong>{bookmarkCount}</strong> {bookmarkCount === 1 ? 'questão marcada' : 'questões marcadas'} para revisão.
                            </p>
                        </div>
                    </div>
                )}

                {/* Search Text (New) */}
                <div className="px-4 pt-6 pb-2">
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em]">Busca</h3>
                </div>
                <div className="px-4 pb-2">
                    <label className="flex flex-col flex-1">
                        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Palavra-chave (Enunciado ou Alternativas)</p>
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Ex: Direito Penal, Art. 5º..."
                            className={inputClassName}
                        />
                    </label>
                </div>

                <div className="h-[1px] bg-gray-200 dark:bg-[#222831] mx-4 my-4"></div>

                {/* Discipline */}
                <div className="px-4 pb-2">
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em]">Conteúdo</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                    <div className="py-2">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Disciplina</p>
                            <div className="relative">
                                <select
                                    value={discipline}
                                    onChange={(e) => setDiscipline(e.target.value)}
                                    className={selectClassName}
                                    style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                                >
                                    <option value="">Selecione a disciplina</option>
                                    {disciplines.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <span className="material-symbols-outlined">expand_more</span>
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Source (Fonte) */}
                    <div className="py-2">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Fonte / Legislação</p>
                            <div className="relative">
                                <select
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    className={selectClassName}
                                    style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                                >
                                    <option value="">Todas as fontes</option>
                                    {sources.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <span className="material-symbols-outlined">expand_more</span>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="h-[1px] bg-gray-200 dark:bg-[#222831] mx-4 my-4"></div>

                {/* Question Limit */}
                <div className="px-4 py-2">
                    <label className="flex flex-col min-w-40 flex-1">
                        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Quantidade de Questões</p>
                        <div className="relative">
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className={selectClassName}
                                style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                            >
                                <option value={10}>10 Questões</option>
                                <option value={20}>20 Questões</option>
                                <option value={50}>50 Questões</option>
                                <option value={100}>100 Questões</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <span className="material-symbols-outlined">expand_more</span>
                            </div>
                        </div>
                    </label>
                </div>

                <div className="h-[1px] bg-gray-200 dark:bg-[#222831] mx-4 my-4"></div>

                {/* Exam (Prova) - Hide if in bookmarks context? Maybe keep it. User said "must have 3 filters... Discipline, Source". Didn't exclude Exam, but didn't ask for it. I'll keep it. */}
                <div className="px-4 py-2">
                    <label className="flex flex-col min-w-40 flex-1">
                        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Prova / Concurso</p>
                        <div className="relative">
                            <select
                                value={exam}
                                onChange={(e) => setExam(e.target.value)}
                                className={selectClassName}
                                style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                            >
                                <option value="">Todas as provas</option>
                                {exams.map(ex => (
                                    <option key={ex} value={ex}>{ex}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <span className="material-symbols-outlined">expand_more</span>
                            </div>
                        </div>
                    </label>
                </div>

                {/* Toggles */}
                <div className="px-4 pt-4 mt-2 space-y-2">
                    <label className="flex items-center justify-between py-3 cursor-pointer group">
                        <span className="text-base font-medium text-gray-900 dark:text-white">Somente não respondidas</span>
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={onlyNotAnswered}
                            onChange={(e) => setOnlyNotAnswered(e.target.checked)}
                        />
                        <div className="relative w-11 h-6 bg-gray-300 dark:bg-[#3b4354] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                    <label className="flex items-center justify-between py-3 cursor-pointer group" onClick={(e) => {
                        if (!isPremium) {
                            e.preventDefault();
                            setShowPremiumModal(true);
                        }
                    }}>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-medium text-gray-900 dark:text-white">Somente questões que errei</span>
                            {!isPremium && <span className="material-symbols-outlined text-sm text-yellow-600" title="Premium">lock</span>}
                        </div>
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={onlyWrong}
                            onChange={(e) => {
                                if (isPremium) setOnlyWrong(e.target.checked);
                            }}
                            disabled={!isPremium}
                        />
                        <div className={`relative w-11 h-6 bg-gray-300 dark:bg-[#3b4354] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${isPremium ? 'peer-checked:bg-primary' : 'opacity-60 cursor-not-allowed'}`}></div>
                    </label>
                </div>
            </main>

            {/* Premium Upsell Modal */}
            {showPremiumModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl scale-100 animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full mx-auto flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-[32px]">workspace_premium</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filtro Exclusivo Premium</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
                                Estude com eficiência focando apenas onde você tem dificuldade. Assine o Premium para desbloquear!
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => onNavigate(Screen.SUBSCRIPTION)}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                            >
                                Assinar Agora
                            </button>
                            <button
                                onClick={() => setShowPremiumModal(false)}
                                className="w-full py-3 text-gray-500 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                Talvez depois
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Action - Sticky Bottom */}
            <div className="sticky bottom-0 z-30 p-4 pb-24 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-[#222831]">
                <button
                    onClick={handleApplyFilters}
                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30"
                >
                    <span className="truncate">
                        {isBookmarksContext
                            ? 'Revisar Questões'
                            : matchingCount !== null
                                ? `Filtrar Questões (${matchingCount})`
                                : 'Filtrar Questões'
                        }
                    </span>
                </button>
            </div>
        </div>
    );
};

export default FilterScreen;
