import React, { useEffect, useState, useRef } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';

const SettingsScreen: React.FC<NavigationProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [profile, setProfile] = useState({
    id: '',
    display_name: '',
    target_exam: '',
    is_public: false,
    avatar_url: null as string | null,
    subscription_plan: 'free'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onNavigate(Screen.LOGIN);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          id: data.id,
          display_name: data.display_name || 'Usuário',
          target_exam: data.target_exam || 'CFS',
          is_public: data.is_public || false,
          avatar_url: data.avatar_url,
          subscription_plan: data.subscription_plan || 'free'
        });
      } else if (error) {
        console.error('Error fetching profile:', error);
      }
    } catch (error) {
      console.error('Exception fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate(Screen.LOGIN);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: profile.display_name,
          target_exam: profile.target_exam,
          is_public: profile.is_public
        })
        .eq('id', profile.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const togglePrivacy = async () => {
    // Toggle immediately for UI, then save
    const newValue = !profile.is_public;
    setProfile(prev => ({ ...prev, is_public: newValue }));

    try {
      await supabase
        .from('user_profiles')
        .update({ is_public: newValue })
        .eq('id', profile.id);
    } catch (error) {
      console.error('Error toggling privacy:', error);
      // Revert on error
      setProfile(prev => ({ ...prev, is_public: !newValue }));
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">Carregando...</div>;
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-full flex flex-col pb-24">
      {/* Top App Bar */}
      <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center px-4 h-14 justify-between">
          <button
            onClick={() => onNavigate(Screen.DASHBOARD)}
            className="flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-900 dark:text-white text-[24px]">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Configurações</h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 w-full px-4 pt-4">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="relative shrink-0 cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="size-20 rounded-full bg-cover bg-center border-2 border-primary"
              style={{
                backgroundImage: `url("${profile.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBetRp082sicGUBTeDyr2A97lX36Duj98k65jsxmAKdtZwRS-5-dyVnEWLQUoHWTrIGCiM3umnXwlc4abC-y35wNX3ZQ3zt1Yyx6dj8Zl0D8BFugyTKceuJcXcDkobpGQug6ZU0JE_-Ncxb9aOYf5P4oQURxBHsr5kgfWQSVVp-jrWXQKOAXSQQFKge18ShtqF2PH1FK31-7U2sydpCSzCborMSetRiT6OfAJY_t-86mjHS_tpyZ3n5GxXU-t6vvFMfX8tF_hcRyQ'}")`,
                opacity: uploading ? 0.5 : 1
              }}
            ></div>
            <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 border-2 border-background-light dark:border-background-dark flex items-center justify-center group-hover:bg-primary-600 transition-colors">
              <span className="material-symbols-outlined text-[16px]">{uploading ? 'refresh' : 'edit'}</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={uploadAvatar}
              accept="image/*"
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </div>

          <div className="flex flex-col flex-1">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="px-2 py-1 border rounded bg-surface-50 text-sm"
                  placeholder="Seu Nome"
                />
                <div className="flex gap-2">
                  <select
                    value={profile.target_exam}
                    onChange={(e) => setProfile({ ...profile, target_exam: e.target.value })}
                    className="px-2 py-1 pr-8 border rounded bg-surface-50 text-sm cursor-pointer"
                  >
                    <option value="CFS">CFS</option>
                    <option value="CFC">CFC</option>
                    <option value="CHO">CHO</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs bg-primary text-white px-3 py-1 rounded font-bold"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-gray-500 px-2 py-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold leading-tight">{profile.display_name}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Concurso {profile.target_exam}</p>
                  {profile.subscription_plan && profile.subscription_plan !== 'free' && (
                    <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Premium</span>
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-primary text-sm font-medium mt-1 hover:underline text-left"
                >
                  Editar perfil
                </button>
              </>
            )}
          </div>
        </div>



        {/* Section: Conta */}
        <div className="mb-6">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 px-2">Conta</h3>
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800/50">
            <div className="w-full flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center justify-center rounded-lg bg-orange-500/10 shrink-0 size-9 text-orange-500">
                <span className="material-symbols-outlined text-[20px]">visibility</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium leading-normal">Perfil Público</p>
                <p className="text-xs text-gray-500">Aparecer no Ranking Geral</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={profile.is_public}
                  onChange={togglePrivacy}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>

            {[
              {
                icon: 'credit_card',
                title: 'Assinatura',
                label: profile.subscription_plan && profile.subscription_plan !== 'free' ? 'PREMIUM' : 'FREE',
                color: 'text-gray-500',
                bg: 'bg-gray-100',
                action: () => onNavigate(Screen.SUBSCRIPTION)
              }
            ].map((item, idx) => (
              <button
                key={item.title}
                onClick={item.action}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${idx !== 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : ''}`}
              >
                <div className={`flex items-center justify-center rounded-lg ${item.bg} shrink-0 size-9 ${item.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <div className="flex-1 text-left flex items-center justify-between">
                  <p className="text-sm font-medium leading-normal">{item.title}</p>
                  {item.label && (
                    <span className={`text-xs font-bold px-2 py-1 rounded mr-2 ${item.label === 'PREMIUM'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-200 text-gray-600'
                      }`}>
                      {item.label}
                    </span>
                  )}
                </div>
                <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-[20px]">chevron_right</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section: Geral */}
        <div className="mb-8">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 px-2">Geral</h3>
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800/50">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 ${showHelp ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
            >
              <div className="flex items-center justify-center rounded-lg bg-emerald-500/10 shrink-0 size-9 text-emerald-500">
                <span className="material-symbols-outlined text-[20px]">help</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium leading-normal">Ajuda e Suporte</p>
              </div>
              <span className={`material-symbols-outlined text-gray-400 dark:text-gray-500 text-[20px] transition-transform duration-200 ${showHelp ? 'rotate-90' : ''}`}>chevron_right</span>
            </button>

            {showHelp && (
              <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-700/50 text-sm animate-in slide-in-from-top-2 duration-200">
                <p className="text-gray-600 dark:text-gray-400 mb-2">Fale conosco através dos canais:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    <span className="font-medium">suporte@pmmg-concursos.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span className="font-medium">WhatsApp: (31) 99999-9999</span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowTerms(!showTerms)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${showTerms ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
            >
              <div className="flex items-center justify-center rounded-lg bg-emerald-500/10 shrink-0 size-9 text-emerald-500">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium leading-normal">Termos de Uso</p>
              </div>
              <span className={`material-symbols-outlined text-gray-400 dark:text-gray-500 text-[20px] transition-transform duration-200 ${showTerms ? 'rotate-90' : ''}`}>chevron_right</span>
            </button>

            {showTerms && (
              <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 text-sm animate-in slide-in-from-top-2 duration-200">
                <div className="h-48 overflow-y-auto pr-2 mb-4 text-gray-600 dark:text-gray-400 text-xs leading-relaxed border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-900">
                  <p className="font-bold mb-2">1. Aceitação</p>
                  <p className="mb-2">Ao acessar o PMMG Concursos, você concorda com estes termos de uso.</p>
                  <p className="font-bold mb-2">2. Uso do Serviço</p>
                  <p className="mb-2">O aplicativo é destinado exclusivamente para uso pessoal e estudo. É proibido compartilhar sua conta com terceiros.</p>
                  <p className="font-bold mb-2">3. Conteúdo</p>
                  <p className="mb-2">Todo o material (questões, simulados) é protegido por direitos autorais.</p>
                  <p className="font-bold mb-2">4. Assinatura</p>
                  <p className="mb-2">Os planos Premium desbloqueiam funcionalidades exclusivas. O cancelamento pode ser feito a qualquer momento nas configurações.</p>
                  <p className="font-bold mb-2">5. Alterações</p>
                  <p className="mb-2">Podemos atualizar estes termos periodicamente. O uso contínuo implica aceitação das mudanças.</p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${termsAccepted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-400 dark:border-gray-600'}`}>
                    {termsAccepted && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                    Li e aceito os Termos de Uso
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-4 text-center text-red-500 font-medium text-base hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors mb-2"
        >
          Sair da Conta
        </button>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mb-6">Versão 2.4.0 (Build 302)</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
