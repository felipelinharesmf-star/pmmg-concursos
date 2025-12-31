import React, { useState } from 'react';
import { NavigationProps, Screen, FilterParams } from '../types';
import { supabase } from '../lib/supabase';

const FilterScreen: React.FC<NavigationProps> = ({ onNavigate, params }) => {
    const isBookmarksContext = params?.context === 'bookmarks';

    // Multi-select state
    const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);

    const [exam, setExam] = useState(''); // Keep exam single for now or user didn't explicitly ask to change it, but standard is single.
    const [searchText, setSearchText] = useState('');
    const [limit, setLimit] = useState(20);

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

                const applyBookmarkFilter = (query: any) => {
                    if (isBookmarksContext) {
                        return bookmarkedIds.length > 0 ? query.in('ID', bookmarkedIds) : query.in('ID', [0]);
                    }
                    return query;
                };

                // 1. Matéria (Disciplina)
                let dQuery = supabase.from('questões crs').select('Matéria');
                dQuery = applyBookmarkFilter(dQuery);
                const { data: dData, error: dError } = await dQuery;
                if (dData) {
                    const unique = [...new Set(dData.map((i: any) => i.Matéria || i.materia || i.Materia))].filter(Boolean).sort();
                    setDisciplines(unique);
                }

                // 3. Prova
                let pQuery = supabase.from('questões crs').select('Prova');
                pQuery = applyBookmarkFilter(pQuery);
                const { data: pData } = await pQuery;
                if (pData) {
                    const unique = [...new Set(pData.map((i: any) => i.Prova || i.prova))].filter(Boolean).sort();
                    setExams(unique);
                }
            } catch (err) {
                console.error('Error fetching options:', err);
            }
        };
        fetchInitialOptions();
    }, [isBookmarksContext]);

    // Fetch Sources (Dependent)
    React.useEffect(() => {
        const fetchSources = async () => {
            try {
                let query = supabase.from('questões crs').select('Fonte_documento');

                // If disciplines selected, filter sources by those disciplines
                if (selectedDisciplines.length > 0) {
                    // We need to use 'in' for multiple disciplines
                    query = query.in('Matéria', selectedDisciplines);
                }

                if (isBookmarksContext) {
                    // Re-fetch bookmark logic simplified here for brevity, assuming standard flow
                    // Ideally we reuse the ID list but for now we just let it run or rely on broad fetch if context is bookmarks
                    // For performance in production we should optimize this.
                }

                const { data: sData, error: sError } = await query;
                if (sData) {
                    const unique = [...new Set(sData.map((i: any) => i.Fonte_documento || i.fonte_documento))].filter(Boolean).sort();
                    setSources(unique);
                }
            } catch (err) {
                console.error('Error fetching sources:', err);
            }
        };

        // Only reset sources if they are invalid? No, usually keep them.
        fetchSources();
    }, [selectedDisciplines, isBookmarksContext]);


    // Count Logic
    const [matchingCount, setMatchingCount] = useState<number | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    React.useEffect(() => {
        const checkPremium = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('user_profiles').select('subscription_plan').eq('id', user.id).single();
                if (profile && ['monthly', 'quarterly', 'semiannual'].includes(profile.subscription_plan)) setIsPremium(true);
            }
        };
        checkPremium();
    }, []);

    React.useEffect(() => {
        const fetchMatchingCount = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const rpcParams = {
                p_discipline: selectedDisciplines.length > 0 ? selectedDisciplines : null,
                p_source: selectedSources.length > 0 ? selectedSources : null,
                p_exam: exam || null,
                p_search_text: searchText.length > 0 ? searchText : null,
                p_user_id: user?.id || null,
                p_only_wrong: onlyWrong,
                p_only_not_answered: onlyNotAnswered
            };

            const { data, error } = await supabase.rpc('get_questions_count', rpcParams);
            if (!error) setMatchingCount(data);
        };
        const timeoutId = setTimeout(fetchMatchingCount, 500);
        return () => clearTimeout(timeoutId);
    }, [selectedDisciplines, selectedSources, exam, searchText, onlyNotAnswered, onlyWrong]);

    const handleApplyFilters = () => {
        const filters: FilterParams = {
            discipline: selectedDisciplines.length > 0 ? selectedDisciplines : undefined,
            source: selectedSources.length > 0 ? selectedSources : undefined,
            exam,
            onlyNotAnswered,
            onlyWrong,
            searchText: searchText.trim() || undefined,
            onlyBookmarks: isBookmarksContext || undefined
        };
        onNavigate(Screen.QUESTION, { ...filters, limit });
    };

    const handleClearFilters = () => {
        setSelectedDisciplines([]);
        setSelectedSources([]);
        setExam('');
        setSearchText('');
        setOnlyNotAnswered(false);
        setOnlyWrong(false);
        setLimit(20);
    };

    // Toggle Helpers
    const toggleDiscipline = (d: string) => {
        if (!d) return;
        setSelectedDisciplines(prev =>
            prev.includes(d) ? prev.filter(item => item !== d) : [...prev, d]
        );
    };

    const toggleSource = (s: string) => {
        if (!s) return;
        setSelectedSources(prev =>
            prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]
        );
    };

    const selectClassName = "w-full rounded-xl border border-gray-300 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] text-gray-900 dark:text-white h-14 pl-4 pr-10 focus:border-primary focus:ring-primary text-base appearance-none outline-none bg-none";
    const inputClassName = "w-full rounded-xl border border-gray-300 dark:border-[#3b4354] bg-white dark:bg-[#1c1f27] text-gray-900 dark:text-white h-14 px-4 focus:border-primary focus:ring-primary text-base outline-none";

    // Reusable Chip Component
    const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200 border border-primary-200 dark:border-primary-800">
            {label}
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="hover:text-primary-900 dark:hover:text-white">
                <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
        </span>
    );

    return (
        <div className="relative flex min-h-full w-full flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
            <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center px-4 h-14 justify-between">
                    <button onClick={() => onNavigate(Screen.DASHBOARD)} className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">
                        {isBookmarksContext ? 'Filtrar Revisão' : 'Filtro de Questões'}
                    </h2>
                    <div className="flex w-10 items-center justify-end">
                        <button onClick={handleClearFilters} className="text-primary text-sm font-bold">Limpar</button>
                    </div>
                </div>
            </div>

            <main className="flex-1 pb-4 w-full px-4 space-y-4">
                {/* Search */}
                <div className="px-4 pt-6">
                    <label className="flex flex-col flex-1">
                        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Busca por Palavra-chave</p>
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Ex: Direito Penal, Art. 5º..."
                            className={inputClassName}
                        />
                    </label>
                </div>

                <div className="h-[1px] bg-gray-200 dark:bg-[#222831] mx-4"></div>

                {/* Disciplines Multi-Select */}
                <div className="px-4">
                    <label className="flex flex-col min-w-40 flex-1">
                        <div className="flex justify-between items-center pb-2">
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal ml-1">Disciplina(s)</p>
                            {selectedDisciplines.length > 0 && <span className="text-xs text-primary font-bold">{selectedDisciplines.length} selecionada(s)</span>}
                        </div>

                        <div className="relative">
                            <select
                                onChange={(e) => {
                                    toggleDiscipline(e.target.value);
                                    e.target.value = ''; // Reset select
                                }}
                                className={selectClassName}
                            >
                                <option value="">Adicionar disciplina...</option>
                                {disciplines.filter(d => !selectedDisciplines.includes(d)).map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <span className="material-symbols-outlined">add_circle</span>
                            </div>
                        </div>

                        {/* Selected Chips */}
                        {selectedDisciplines.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                {selectedDisciplines.map(d => (
                                    <Chip key={d} label={d} onRemove={() => toggleDiscipline(d)} />
                                ))}
                            </div>
                        )}
                    </label>
                </div>

                {/* Sources Multi-Select */}
                <div className="px-4">
                    <label className="flex flex-col min-w-40 flex-1">
                        <div className="flex justify-between items-center pb-2">
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal ml-1">Fonte / Legislação</p>
                            {selectedSources.length > 0 && <span className="text-xs text-primary font-bold">{selectedSources.length} selecionada(s)</span>}
                        </div>
                        <div className="relative">
                            <select
                                onChange={(e) => {
                                    toggleSource(e.target.value);
                                    e.target.value = '';
                                }}
                                className={selectClassName}
                            >
                                <option value="">Adicionar fonte...</option>
                                {sources.filter(s => !selectedSources.includes(s)).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <span className="material-symbols-outlined">add_circle</span>
                            </div>
                        </div>

                        {selectedSources.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                {selectedSources.map(s => (
                                    <Chip key={s} label={s} onRemove={() => toggleSource(s)} />
                                ))}
                            </div>
                        )}
                    </label>
                </div>

                <div className="h-[1px] bg-gray-200 dark:bg-[#222831] mx-4"></div>

                {/* Limit & Exam */}
                <div className="grid grid-cols-2 gap-4 px-4">
                    <div className="py-2">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Quantidade</p>
                            <div className="relative">
                                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={selectClassName}>
                                    <option value={10}>10 Questões</option>
                                    <option value={20}>20 Questões</option>
                                    <option value={50}>50 Questões</option>
                                    <option value={100}>100 Questões</option>
                                </select>
                            </div>
                        </label>
                    </div>
                    <div className="py-2">
                        <label className="flex flex-col min-w-40 flex-1">
                            <p className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-normal pb-2 ml-1">Prova / Concurso</p>
                            <div className="relative">
                                <select value={exam} onChange={(e) => setExam(e.target.value)} className={selectClassName}>
                                    <option value="">Todas</option>
                                    {exams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                </select>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Toggles */}
                <div className="px-4 space-y-2">
                    <label className="flex items-center justify-between py-3 cursor-pointer group" onClick={(e) => { if (!isPremium) { e.preventDefault(); setShowPremiumModal(true); } }}>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-medium text-gray-900 dark:text-white">Somente não respondidas</span>
                            {!isPremium && <span className="material-symbols-outlined text-sm text-yellow-600" title="Premium">lock</span>}
                        </div>
                        <input type="checkbox" className="sr-only peer" checked={onlyNotAnswered} onChange={(e) => isPremium && setOnlyNotAnswered(e.target.checked)} disabled={!isPremium} />
                        <div className={`relative w-11 h-6 bg-gray-300 dark:bg-[#3b4354] rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${!isPremium ? 'opacity-60' : ''}`}></div>
                    </label>
                    <label className="flex items-center justify-between py-3 cursor-pointer group" onClick={(e) => { if (!isPremium) { e.preventDefault(); setShowPremiumModal(true); } }}>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-medium text-gray-900 dark:text-white">Somente questões que errei</span>
                            {!isPremium && <span className="material-symbols-outlined text-sm text-yellow-600" title="Premium">lock</span>}
                        </div>
                        <input type="checkbox" className="sr-only peer" checked={onlyWrong} onChange={(e) => isPremium && setOnlyWrong(e.target.checked)} disabled={!isPremium} />
                        <div className={`relative w-11 h-6 bg-gray-300 dark:bg-[#3b4354] rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${!isPremium ? 'opacity-60' : ''}`}></div>
                    </label>
                </div>
            </main>

            {/* Footer */}
            <div className="sticky bottom-0 z-30 p-4 pb-24 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-[#222831]">
                <button onClick={handleApplyFilters} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
                    <span className="truncate">
                        {isBookmarksContext ? 'Revisar Questões' : matchingCount !== null ? `Filtrar Questões (${matchingCount})` : 'Filtrar Questões'}
                    </span>
                </button>
            </div>

            {/* Premium Modal (Copied logic) */}{showPremiumModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl scale-100 animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full mx-auto flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-white text-[32px]">workspace_premium</span></div>
                        <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Filtro Exclusivo Premium</h2><p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">Assine o Premium para desbloquear!</p></div>
                        <div className="flex flex-col gap-2 pt-2">
                            <button onClick={() => onNavigate(Screen.SUBSCRIPTION)} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md">Assinar Agora</button>
                            <button onClick={() => setShowPremiumModal(false)} className="w-full py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-xl">Talvez depois</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterScreen;
