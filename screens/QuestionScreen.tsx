import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen, Question, FilterParams } from '../types';
import { supabase } from '../lib/supabase';

const QuestionScreen: React.FC<NavigationProps> = ({ onNavigate, params }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for limit enforcement
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [dailyCount, setDailyCount] = useState(0);

  // Check limits on load
  useEffect(() => {
    checkDailyLimit();
  }, []);

  const checkDailyLimit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Plan
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .single();

      const plan = profile?.subscription_plan || 'free';
      setSubscriptionPlan(plan);

      if (plan === 'free') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
          .from('user_answers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString());

        if (error) console.error('Error counting daily answers:', error);

        const countVal = count || 0;
        setDailyCount(countVal);

        if (countVal >= 10) {
          setIsLimitReached(true);
        }
      }
    } catch (err) {
      console.error('Error checking limit:', err);
    }
  };

  // State for bookmark
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);

  // Check bookmark status when current question changes
  useEffect(() => {
    if (questions.length > 0 && currentQuestion) {
      checkBookmarkStatus();
    }
  }, [currentIndex, questions]);

  const checkBookmarkStatus = async () => {
    if (!currentQuestion) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', currentQuestion.id)
        .maybeSingle(); // Use maybeSingle to avoid 406 error if multiple (should be unique though) or 0

      if (data) {
        setIsBookmarked(true);
        setBookmarkId(data.id);
      } else {
        setIsBookmarked(false);
        setBookmarkId(null);
      }
    } catch (err) {
      console.error('Error checking bookmark:', err);
    }
  };

  const toggleBookmark = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Optimistic update
      const previousState = isBookmarked;
      setIsBookmarked(!previousState);

      if (previousState) {
        // Remove bookmark
        const { error } = await supabase
          .from('user_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('question_id', currentQuestion.id);

        if (error) {
          console.error('Error removing bookmark:', error);
          setIsBookmarked(previousState); // Revert
        } else {
          setBookmarkId(null);
        }
      } else {
        // Add bookmark
        const { data, error } = await supabase
          .from('user_bookmarks')
          .insert({
            user_id: user.id,
            question_id: currentQuestion.id
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding bookmark:', error);
          setIsBookmarked(previousState); // Revert
        } else if (data) {
          setBookmarkId(data.id);
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      setIsBookmarked(isBookmarked); // Revert
    }
  };

  const setQuestionsFromData = (data: any[]) => {
    if (!data || data.length === 0) {
      setError('Nenhuma questão encontrada.');
      setQuestions([]);
      return;
    }

    const mappedQuestions: Question[] = data.map((q: any) => ({
      id: q.ID || q.id,
      exam: q.Prova || q.prova,
      subject: q.Matéria || q.materia,
      questionLabel: q.Questão ? `Questão ${q.Questão}` : `Questão ${q.id}`,
      text: q.Enunciado || q.enunciado,
      options: [
        { id: 'A', text: q.AlternativaA || q.Alternativa_a || q.alternativaA || '' },
        { id: 'B', text: q.AlternativaB || q.Alternativa_b || q.alternativaB || '' },
        { id: 'C', text: q.AlternativaC || q.Alternativa_c || q.alternativaC || '' },
        { id: 'D', text: q.AlternativaD || q.Alternativa_d || q.alternativaD || '' },
      ],
      correctOptionId: q.Gabarito || q.gabarito,
      source: q.Fonte_documento || q.fonte_documento || ''
    }));
    setQuestions(mappedQuestions);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cast params to include onlyBookmarks and searchText
      const filters = params as (FilterParams & { onlyBookmarks?: boolean, onlyWrong?: boolean, searchText?: string }) | undefined;
      console.log('Fetching with filters:', filters);

      let questionIdsToFetch: number[] = [];

      const { data: { user } } = await supabase.auth.getUser();

      // If review errors mode is on
      if (filters?.onlyWrong) {
        if (!user) throw new Error('User not found');

        // ... (existing logic for onlyWrong)
        const { data: wrongAnswers, error: waError } = await supabase
          .from('user_answers')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('is_correct', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (waError) throw waError;
        if (!wrongAnswers || wrongAnswers.length === 0) {
          setQuestions([]);
          setLoading(false);
          return;
        }
        questionIdsToFetch = Array.from(new Set(wrongAnswers.map(a => a.question_id)));
      }
      // NEW: If filtered by bookmarks
      else if (filters?.onlyBookmarks) {
        if (!user) throw new Error('User not found');

        const { data: bookmarks, error: bmError } = await supabase
          .from('user_bookmarks')
          .select('question_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bmError) throw bmError;

        if (!bookmarks || bookmarks.length === 0) {
          setQuestions([]);
          setLoading(false);
          setError('Você ainda não tem questões marcadas para revisão.');
          return;
        }
        questionIdsToFetch = Array.from(new Set(bookmarks.map(b => b.question_id)));
      }

      // 3. Main Fetch Logic
      // If we have specific IDs (from Wrong or Bookmarks), fetch them directly
      if (questionIdsToFetch.length > 0) {
        const { data, error } = await supabase
          .from('questões crs')
          .select('*')
          .in('ID', questionIdsToFetch);

        if (error) throw error;
        setQuestionsFromData(data);
      }
      // Otherwise, use the Random RPC for standard simulation
      else {
        // Prepare RPC params
        const rpcParams = {
          p_discipline: filters?.discipline || null,
          p_source: filters?.source || null,
          p_exam: filters?.exam || null,
          p_search_text: filters?.searchText || null,
          p_limit: filters?.limit || 50,
          p_exclude_ids: filters?.onlyNotAnswered && user ? (
            // We need to fetch answered IDs first if exclude is on
            // For now, let's keep it simple or implement the exclude logic inside RPC if possible
            // The RPC accepts comma separated string for excludes.
            null
          ) : null
        };

        // Handle "Not Answered" filter for RPC
        if (filters?.onlyNotAnswered && user) {
          const { data: answeredData } = await supabase
            .from('user_answers')
            .select('question_id')
            .eq('user_id', user.id)
            .limit(1000); // Reasonalbe limit

          if (answeredData && answeredData.length > 0) {
            rpcParams.p_exclude_ids = answeredData.map(a => a.question_id).join(',');
          }
        }

        const { data, error } = await supabase.rpc('get_random_questions', rpcParams);

        if (error) throw error;
        setQuestionsFromData(data || []);
      }


    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [params]);

  const currentQuestion = questions[currentIndex];
  // ... (handleNext, checkAnswer exist)

  // ... (In Return JSX)
  // Header section
  /*
  <button className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">bookmark_border</span>
  </button>
  */


  // Duplicate declaration removed
  // const currentQuestion = questions[currentIndex]; // Already declared above

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    }
  };

  const checkAnswer = async () => {
    if (selectedOption) {
      // Re-verify limit before answering (security)
      if (subscriptionPlan === 'free' && dailyCount >= 10) {
        setIsLimitReached(true);
        return;
      }

      setShowResult(true);

      // Update local count immediately to reflect UI
      if (subscriptionPlan === 'free') {
        const newCount = dailyCount + 1;
        setDailyCount(newCount);
        if (newCount >= 10) {
          // We allow this one answer, but warn for next? 
          // Usually better to warn AFTER this answer if they try next, OR show they used 10/10.
          // However, if newCount is 10, they just used their last one.
          // If newCount > 10, they are over limit.
        }
      }

      // Save history to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_answers').insert({
            user_id: user.id,
            question_id: currentQuestion.id,
            is_correct: selectedOption === currentQuestion.correctOptionId,
            subject: currentQuestion.subject,
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Error saving answer history:', err);
      }
    }
  };

  const getOptionStyle = (optionKey: string) => {
    let style = "option-card";

    if (showResult) {
      if (optionKey === currentQuestion.correctOptionId) {
        return `${style} correct-answer`;
      }
      if (selectedOption === optionKey && selectedOption !== currentQuestion.correctOptionId) {
        return `${style} wrong-answer`;
      }
    }

    if (selectedOption === optionKey) {
      return `${style} selected`;
    }

    return style;
  };

  // Limit Modal
  if (isLimitReached) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-gradient-to-tr from-primary-500 to-purple-600 rounded-full mx-auto flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-[32px]">lock</span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Limite Diário Atingido</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
              Você já respondeu 10 questões hoje. Ser <span className="font-bold text-primary-600">Premium</span> te dá acesso ilimitado!
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => onNavigate(Screen.SUBSCRIPTION)}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              Virar Premium Agora
            </button>
            <button
              onClick={() => onNavigate(Screen.DASHBOARD)}
              className="w-full py-3 text-gray-500 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-lg text-gray-500">
      <span className="material-symbols-outlined animate-spin mb-2" style={{ fontSize: '48px' }}>refresh</span>
      <p>Carregando questões...</p>
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button
          onClick={fetchQuestions}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 font-bold"
        >
          Tentar Novamente
        </button>
        <button
          onClick={() => onNavigate(Screen.FILTER)}
          className="mt-6 text-primary underline font-medium"
        >
          Voltar e Ajustar Filtros
        </button>
      </div>
    );
  }

  if (!currentQuestion) return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <p className="text-gray-500 text-lg">Nenhuma questão disponível.</p>
      <button
        onClick={() => onNavigate(Screen.FILTER)}
        className="mt-4 text-primary underline font-medium"
      >
        Voltar aos Filtros
      </button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-background-light dark:bg-background-dark relative">
      {/* Top App Bar */}
      <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center px-4 h-14 justify-between">
          <button
            onClick={() => onNavigate(Screen.DASHBOARD)}
            className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">arrow_back</span>
          </button>
          <div className="flex-col items-center flex-1 text-center">
            <h2 className="text-sm font-bold leading-tight tracking-tight text-slate-900 dark:text-white uppercase">Simulado PMMG</h2>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Questão {currentIndex + 1} de {questions.length}</span>
              {subscriptionPlan === 'free' && (
                <span className={`${dailyCount >= 8 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                  • {dailyCount}/10 hoje
                </span>
              )}
            </div>
          </div>
          <button
            onClick={toggleBookmark}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full border transition-all ${isBookmarked ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${isBookmarked ? 'font-variation-fill' : ''}`}
              style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
            <span className="text-sm font-semibold">
              {isBookmarked ? 'Salva para revisão' : 'Salvar para revisão'}
            </span>
          </button>
        </div>

        {/* Progress Bar inside Header */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-primary-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <main className="relative flex-1 bg-background-light dark:bg-background-dark">
        <div className="w-full pb-24">


          {/* Question Header/Context */}
          <div className="px-4 pt-6 pb-2">
            <div className="question-tag" style={{ marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>school</span>
              <span>{currentQuestion.subject}</span>
            </div>

            <div className="text-body text-gray-900 dark:text-gray-100 mb-4 font-medium leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {currentQuestion.text.replace(/\\n/g, '\n')}
            </div>
          </div>

          {/* Answer Options */}
          <div className="flex-col gap-4" style={{ padding: '0 20px 24px' }}>
            {currentQuestion.options.map((opt) => (
              <div
                key={opt.id}
                className={getOptionStyle(opt.id)}
                onClick={() => !showResult && setSelectedOption(opt.id)}
              >
                <div className="radio-circle flex items-center justify-center">
                  {/* Add checkmark or x if needed */}
                </div>
                <div className="flex-col">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Alternativa {opt.id}</span>
                  <p className="text-body text-gray-900 dark:text-gray-100 font-medium">
                    {opt.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {showResult && (
            <div style={{ padding: '0 20px', marginBottom: '20px' }}>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: selectedOption === currentQuestion.correctOptionId ? 'var(--success-light)' : 'var(--error-light)',
                color: selectedOption === currentQuestion.correctOptionId ? 'var(--success-dark)' : 'var(--error-dark)',
                fontWeight: 'bold'
              }}>
                {selectedOption === currentQuestion.correctOptionId ? 'Resposta Correta!' : `Incorreto! A resposta é a letra ${currentQuestion.correctOptionId}`}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Bottom Action Bar (Sticky) */}
      <footer className="sticky bottom-0 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 pb-24 flex gap-4">
        {!showResult ? (
          <button
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={checkAnswer}
            disabled={!selectedOption}
          >
            <span>Responder</span>
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </button>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
            onClick={handleNext}
          >
            <span>Próxima Questão</span>
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        )}
      </footer>
    </div>
  );
};

export default QuestionScreen;
