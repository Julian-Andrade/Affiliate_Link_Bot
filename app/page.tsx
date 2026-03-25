'use client';

import { useEffect, useState } from 'react';
import { History, Link as LinkIcon, ShoppingBag, User, ChevronLeft, ChevronRight, LogOut, Settings, Save } from 'lucide-react';
import LayoutBuilder, { LayoutBlock, defaultLayout } from '../components/LayoutBuilder';
import DeleteHistoryButton from '../components/DeleteHistoryButton';
import ClearAllHistoryButton from '../components/ClearAllHistoryButton';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, setDoc, onSnapshot, query, orderBy, limit as firestoreLimit, serverTimestamp } from 'firebase/firestore';

export default function Dashboard() {
  const { user, loading, signIn, logOut } = useAuth();
  
  const [history, setHistory] = useState<any[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutBlock[]>(defaultLayout);
  const [botConfig, setBotConfig] = useState({
    telegramBotToken: '',
    shopeeAppId: '',
    shopeeAppSecret: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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
        setBotConfig({
          telegramBotToken: data.telegramBotToken || '',
          shopeeAppId: data.shopeeAppId || '',
          shopeeAppSecret: data.shopeeAppSecret || '',
        });
      } else {
        // Create initial user doc
        setDoc(userDocRef, {
          email: user.email,
          createdAt: serverTimestamp(),
        });
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
      unsubscribeHistory();
    };
  }, [user]);

  const handleSaveConfig = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...botConfig,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Register webhook if token is provided
      if (botConfig.telegramBotToken) {
        const webhookUrl = `${window.location.origin}/api/webhook/telegram/${user.uid}`;
        const response = await fetch(`https://api.telegram.org/bot${botConfig.telegramBotToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
        const data = await response.json();
        if (!data.ok) {
          throw new Error('Erro ao configurar webhook no Telegram');
        }
      }

      setSaveMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setSaveMessage('Erro ao salvar configurações.');
    }
    setIsSaving(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LinkIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bot de Afiliados</h1>
          <p className="text-gray-500 mb-8">Faça login para gerenciar seu bot, configurar suas chaves e ver o histórico de links.</p>
          <button
            onClick={signIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <LinkIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Painel do Afiliado</h1>
              <p className="text-sm text-gray-500 font-medium">Gerencie seu bot e links</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200">
              <img src={user.photoURL || ''} alt="Avatar" className="w-6 h-6 rounded-full" />
              <span className="font-medium">{user.email}</span>
            </div>
            <button
              onClick={logOut}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors bg-white px-3 py-1.5 rounded-full border border-gray-200 hover:border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Esquerda: Configurações */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Configurações do Bot</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Bot Token</label>
                  <input
                    type="password"
                    value={botConfig.telegramBotToken}
                    onChange={(e) => setBotConfig({...botConfig, telegramBotToken: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                  <p className="text-xs text-gray-500 mt-1">Obtenha no @BotFather</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shopee App ID</label>
                  <input
                    type="text"
                    value={botConfig.shopeeAppId}
                    onChange={(e) => setBotConfig({...botConfig, shopeeAppId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="Seu App ID da Shopee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shopee App Secret</label>
                  <input
                    type="password"
                    value={botConfig.shopeeAppSecret}
                    onChange={(e) => setBotConfig({...botConfig, shopeeAppSecret: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="Seu App Secret da Shopee"
                  />
                </div>

                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-70 mt-4"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
                
                {saveMessage && (
                  <p className={`text-sm text-center mt-2 ${saveMessage.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
                    {saveMessage}
                  </p>
                )}
              </div>
            </div>

            <LayoutBuilder initialLayout={layoutConfig} />
          </div>

          {/* Coluna Direita: Histórico */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Histórico Recente</h2>
                </div>
                {history.length > 0 && (
                  <ClearAllHistoryButton />
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Nenhum link gerado ainda pelo seu bot.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Data</th>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Link Afiliado</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {item.createdAt.toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {item.productImage ? (
                                <img src={item.productImage} alt="Produto" className="w-10 h-10 rounded object-cover border border-gray-200" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center border border-gray-200">
                                  <ShoppingBag className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex flex-col max-w-[200px]">
                                <span className="truncate text-gray-800 font-medium" title={item.productTitle || 'Produto desconhecido'}>
                                  {item.productTitle || '-'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-medium">
                                    {item.marketplace}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-[150px] truncate">
                            <a href={item.affiliateUrl} target="_blank" rel="noreferrer" className="text-green-600 hover:underline inline-flex items-center gap-1 font-medium">
                              <LinkIcon className="w-3 h-3" />
                              Link
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right">
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
    </div>
  );
}
