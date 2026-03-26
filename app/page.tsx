'use client';

import { useEffect, useState } from 'react';
import { History, Link as LinkIcon, ShoppingBag, LogOut, Settings, Save, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import LayoutBuilder, { LayoutBlock, defaultLayout } from '../components/LayoutBuilder';
import DeleteHistoryButton from '../components/DeleteHistoryButton';
import ClearAllHistoryButton from '../components/ClearAllHistoryButton';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, query, orderBy, limit as firestoreLimit, serverTimestamp, deleteField } from 'firebase/firestore';

export default function Dashboard() {
  const { user, loading, signIn, logOut } = useAuth();
  
  const [history, setHistory] = useState<any[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutBlock[]>(defaultLayout);
  const [botConfig, setBotConfig] = useState({
    activationToken: '',
    shopeeAppId: '',
    shopeeAppSecret: '',
    telegramChatId: '',
    subscriptionPlan: 'free',
    subscriptionStatus: 'active',
  });
  const [storeConfig, setStoreConfig] = useState({
    storeSlug: '',
    storeName: '',
  });
  const [isStoreActive, setIsStoreActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch user config
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.layoutConfig) {
          try {
            setLayoutConfig(JSON.parse(data.layoutConfig));
          } catch (e) {
            console.error('Failed to parse layout config');
          }
        }
        
        let token = data.activationToken;
        if (!token) {
          token = Math.random().toString(36).substring(2, 10).toUpperCase();
          setDoc(userDocRef, { activationToken: token }, { merge: true });
        }

        setBotConfig({
          activationToken: token,
          shopeeAppId: data.shopeeAppId || '',
          shopeeAppSecret: data.shopeeAppSecret || '',
          telegramChatId: data.telegramChatId || '',
          subscriptionPlan: data.subscriptionPlan || 'free',
          subscriptionStatus: data.subscriptionStatus || 'active',
        });
      } else {
        // Create initial user doc
        const token = Math.random().toString(36).substring(2, 10).toUpperCase();
        setDoc(userDocRef, {
          email: user.email,
          activationToken: token,
          subscriptionPlan: 'free',
          subscriptionStatus: 'active',
          createdAt: serverTimestamp(),
        });
      }
    });

    // Fetch store config
    const storeDocRef = doc(db, 'publicStores', user.uid);
    const unsubscribeStore = onSnapshot(storeDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreConfig({
          storeSlug: data.storeSlug || '',
          storeName: data.storeName || '',
        });
        setIsStoreActive(true);
      } else {
        setIsStoreActive(false);
      }
    });

    // Fetch history
    const historyRef = collection(db, 'users', user.uid, 'linkHistory');
    const q = query(historyRef, orderBy('createdAt', 'desc'), firestoreLimit(50));
    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setHistory(historyData);
    });

    return () => {
      unsubscribeUser();
      unsubscribeStore();
      unsubscribeHistory();
    };
  }, [user]);

  const handleSaveConfig = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        shopeeAppId: botConfig.shopeeAppId,
        shopeeAppSecret: botConfig.shopeeAppSecret,
        layoutConfig: JSON.stringify(layoutConfig),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações.');
    }
    setIsSaving(false);
  };

  const handleSaveStore = async () => {
    if (!user) return;
    if (!storeConfig.storeSlug || !storeConfig.storeName) {
      toast.error('Preencha o nome e o link da loja.');
      return;
    }
    
    // Basic slug validation (alphanumeric and hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(storeConfig.storeSlug)) {
      toast.error('O link da loja deve conter apenas letras minúsculas, números e hifens.');
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'publicStores', user.uid), {
        storeSlug: storeConfig.storeSlug,
        storeName: storeConfig.storeName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      }, { merge: true });

      toast.success('Catálogo salvo com sucesso!');
    } catch (error) {
      console.error('Error saving store:', error);
      toast.error('Erro ao salvar catálogo.');
    }
    setIsSaving(false);
  };

  const handleSyncStore = async () => {
    if (!user || !isStoreActive) return;
    setIsSyncing(true);
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      history.forEach((item) => {
        const productRef = doc(db, 'publicStores', user.uid, 'products', item.id);
        batch.set(productRef, {
          productTitle: item.productTitle || '',
          productImage: item.productImage || '',
          productPrice: item.productPrice || null,
          affiliateUrl: item.affiliateUrl || '',
          marketplace: item.marketplace || '',
          createdAt: item.createdAt || serverTimestamp()
        }, { merge: true });
      });
      
      await batch.commit();
      toast.success('Catálogo sincronizado com sucesso!');
    } catch (error) {
      console.error('Error syncing store:', error);
      toast.error('Erro ao sincronizar catálogo.');
    }
    setIsSyncing(false);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(`/start ${botConfig.activationToken}`);
    setCopied(true);
    toast.success('Comando copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] font-sans">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5] p-4 font-sans">
        <div className="bg-white p-10 rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#f5f5f5] text-[#4a4a4a] rounded-full flex items-center justify-center mx-auto mb-8">
            <LinkIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-light text-[#1a1a1a] mb-3">Bot de Afiliados</h1>
          <p className="text-[#9e9e9e] mb-10 text-sm">Faça login para acessar seu token de ativação, configurar suas chaves e gerenciar seus links.</p>
          <button
            onClick={signIn}
            className="w-full bg-[#1a1a1a] hover:bg-[#333333] text-white font-medium py-4 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
          >
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans pb-20">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <LinkIcon className="w-6 h-6 text-[#1a1a1a]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-light tracking-tight">Painel do Afiliado</h1>
                <span className={`px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded-md ${
                  botConfig.subscriptionPlan === 'premium' ? 'bg-purple-100 text-purple-700' :
                  botConfig.subscriptionPlan === 'pro' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {botConfig.subscriptionPlan}
                </span>
                {botConfig.subscriptionStatus !== 'active' && (
                  <span className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider rounded-md bg-red-100 text-red-700">
                    {botConfig.subscriptionStatus === 'past_due' ? 'Atrasado' : 'Inativo'}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#9e9e9e] mt-1">Gerencie seu bot e links</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {botConfig.subscriptionPlan === 'free' && (
              <button className="hidden sm:block px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-full shadow-md hover:shadow-lg transition-all">
                Fazer Upgrade
              </button>
            )}
            <div className="flex items-center gap-3 text-sm text-[#4a4a4a] bg-white px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <img src={user.photoURL || ''} alt="Avatar" className="w-7 h-7 rounded-full" />
              <span className="font-medium">{user.email}</span>
            </div>
            <button
              onClick={logOut}
              className="flex items-center gap-2 text-sm font-medium text-[#4a4a4a] hover:text-red-600 transition-colors bg-white px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Token Card */}
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="text-xl font-light mb-6">Ativação do Bot</h2>
            
            {botConfig.subscriptionStatus !== 'active' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                <strong>Atenção:</strong> Sua assinatura está inativa. O bot não processará seus links até que a assinatura seja regularizada.
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm text-[#9e9e9e] mb-4">
                1. Acesse o nosso bot oficial no Telegram:
              </p>
              <a 
                href="https://t.me/Garimpo_Facilbot" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center w-full bg-[#f5f5f5] hover:bg-[#e0e0e0] text-[#1a1a1a] font-medium py-3 px-4 rounded-xl transition-colors mb-2"
              >
                Abrir Bot no Telegram
              </a>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/webhook/register');
                    const data = await res.json();
                    if (data.ok) {
                      toast.success('Webhook do bot registrado com sucesso!');
                    } else {
                      toast.error('Erro ao registrar webhook: ' + (data.error || 'Desconhecido'));
                    }
                  } catch (e) {
                    toast.error('Erro de conexão ao registrar webhook.');
                  }
                }}
                className="inline-flex items-center justify-center w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded-xl transition-colors text-sm mb-2"
              >
                Sincronizar Bot (Clique se o bot não responder)
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/webhook/register?info=true');
                    const data = await res.json();
                    if (data.ok && data.info) {
                      if (data.info.url) {
                        toast.success(`Webhook ativo: ${data.info.url}`);
                      } else {
                        toast.error('Webhook não está configurado!');
                      }
                    } else {
                      toast.error('Erro ao verificar status: ' + (data.error || 'Desconhecido'));
                    }
                  } catch (e) {
                    toast.error('Erro de conexão ao verificar status.');
                  }
                }}
                className="inline-flex items-center justify-center w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium py-2 px-4 rounded-xl transition-colors text-sm"
              >
                Verificar Status do Webhook
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#9e9e9e]">
                  2. Envie o comando abaixo para o bot:
                </p>
                <button
                  onClick={async () => {
                    if (!user) return;
                    const newToken = Math.random().toString(36).substring(2, 10).toUpperCase();
                    await setDoc(doc(db, 'users', user.uid), { 
                      activationToken: newToken,
                      telegramChatId: deleteField() 
                    }, { merge: true });
                    toast.success('Novo token gerado com sucesso!');
                  }}
                  className="text-xs text-[#4a4a4a] hover:text-[#1a1a1a] underline"
                >
                  Gerar novo token
                </button>
              </div>
              <div className="flex items-center gap-2 bg-[#f5f5f5] p-3 rounded-xl">
                <code className="text-[#1a1a1a] font-mono flex-1 text-sm">/start {botConfig.activationToken}</code>
                <button 
                  onClick={copyToken}
                  className="p-2 text-[#4a4a4a] hover:text-[#1a1a1a] bg-white rounded-lg shadow-sm"
                  title="Copiar comando"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#f5f5f5]">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${botConfig.telegramChatId ? 'bg-green-500' : 'bg-yellow-400'}`}></div>
                <span className="text-sm font-medium text-[#4a4a4a]">
                  {botConfig.telegramChatId ? 'Bot Ativo e Conectado' : 'Aguardando Ativação'}
                </span>
              </div>
            </div>
          </div>

          {/* Configurações Card */}
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-8">
              <Settings className="w-5 h-5 text-[#4a4a4a]" />
              <h2 className="text-xl font-light">Credenciais Shopee</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Shopee App ID</label>
                <input
                  type="text"
                  value={botConfig.shopeeAppId}
                  onChange={(e) => setBotConfig({...botConfig, shopeeAppId: e.target.value})}
                  className="w-full px-4 py-3 bg-[#f5f5f5] border-none rounded-xl focus:ring-2 focus:ring-[#1a1a1a] outline-none transition-all text-sm"
                  placeholder="Seu App ID da Shopee"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4a4a4a] mb-2">Shopee App Secret</label>
                <input
                  type="password"
                  value={botConfig.shopeeAppSecret}
                  onChange={(e) => setBotConfig({...botConfig, shopeeAppSecret: e.target.value})}
                  className="w-full px-4 py-3 bg-[#f5f5f5] border-none rounded-xl focus:ring-2 focus:ring-[#1a1a1a] outline-none transition-all text-sm"
                  placeholder="Seu App Secret da Shopee"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#333333] text-white font-medium py-3.5 px-4 rounded-xl transition-colors disabled:opacity-70 mt-4"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>

        </div>

        {/* Public Store Configuration */}
        <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#4a4a4a]" />
              <h2 className="text-xl font-light">Catálogo Público</h2>
            </div>
            {isStoreActive && (
              <a 
                href={`/store/${storeConfig.storeSlug}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-[#1a1a1a] hover:text-[#4a4a4a] font-medium flex items-center gap-1"
              >
                Ver Catálogo <LinkIcon size={14} />
              </a>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  value={storeConfig.storeName}
                  onChange={(e) => setStoreConfig({ ...storeConfig, storeName: e.target.value })}
                  placeholder="Minha Loja de Ofertas"
                  className="w-full px-4 py-3 bg-[#f5f5f5] border-none rounded-xl focus:ring-2 focus:ring-[#1a1a1a] outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4a4a4a] mb-2">
                  Link da Loja (Slug)
                </label>
                <div className="flex items-center">
                  <span className="px-4 py-3 bg-[#e0e0e0] rounded-l-xl text-[#4a4a4a] text-sm">
                    /store/
                  </span>
                  <input
                    type="text"
                    value={storeConfig.storeSlug}
                    onChange={(e) => setStoreConfig({ ...storeConfig, storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="minha-loja"
                    className="w-full px-4 py-3 bg-[#f5f5f5] border-none rounded-r-xl focus:ring-2 focus:ring-[#1a1a1a] outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-6 border-t border-[#f5f5f5]">
              <div className="text-sm text-[#9e9e9e]">
                {isStoreActive ? 'Seu catálogo está ativo.' : 'Configure seu catálogo para ativá-lo.'}
              </div>
              <div className="flex gap-3">
                {isStoreActive && (
                  <button
                    onClick={handleSyncStore}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-6 py-3 bg-[#f5f5f5] text-[#1a1a1a] rounded-xl hover:bg-[#e0e0e0] transition-colors disabled:opacity-50 font-medium text-sm"
                  >
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Produtos'}
                  </button>
                )}
                <button
                  onClick={handleSaveStore}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white rounded-xl hover:bg-[#333333] transition-colors disabled:opacity-70 font-medium text-sm"
                >
                  <Save size={16} />
                  {isSaving ? 'Salvando...' : 'Salvar Catálogo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <LayoutBuilder initialLayout={layoutConfig} />
        </div>

        {/* Histórico */}
        <div>
          <div className="bg-white p-8 rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-[#4a4a4a]" />
                  <h2 className="text-xl font-light">Histórico Recente</h2>
                </div>
                {history.length > 0 && (
                  <ClearAllHistoryButton />
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-16 text-[#9e9e9e] bg-[#f5f5f5] rounded-2xl">
                  Nenhum link gerado ainda pelo seu bot.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#9e9e9e] uppercase bg-[#f5f5f5]">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-xl font-medium">Data</th>
                        <th className="px-6 py-4 font-medium">Produto</th>
                        <th className="px-6 py-4 font-medium">Link Afiliado</th>
                        <th className="px-6 py-4 rounded-tr-xl text-right font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5f5f5]">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-[#fafafa] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-[#4a4a4a]">
                            {item.createdAt.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              {item.productImage ? (
                                <img src={item.productImage} alt="Produto" className="w-12 h-12 rounded-lg object-cover bg-[#f5f5f5]" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-[#f5f5f5] flex items-center justify-center">
                                  <ShoppingBag className="w-5 h-5 text-[#9e9e9e]" />
                                </div>
                              )}
                              <div className="flex flex-col max-w-[250px]">
                                <span className="truncate text-[#1a1a1a] font-medium" title={item.productTitle || 'Produto desconhecido'}>
                                  {item.productTitle || '-'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-[#9e9e9e] mt-1">
                                  <span className="px-2 py-1 rounded-md bg-[#f5f5f5] font-medium uppercase tracking-wider text-[10px]">
                                    {item.marketplace}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-[150px] truncate">
                            <a href={item.affiliateUrl} target="_blank" rel="noreferrer" className="text-[#1a1a1a] hover:underline inline-flex items-center gap-1 font-medium">
                              <LinkIcon className="w-3 h-3" />
                              Link
                            </a>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DeleteHistoryButton id={item.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

      </div>
    </div>
  );
}
