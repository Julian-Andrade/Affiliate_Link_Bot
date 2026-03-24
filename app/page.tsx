import { PrismaClient } from '@prisma/client';
import { History, Link as LinkIcon, ShoppingBag, User } from 'lucide-react';
import LayoutBuilder, { LayoutBlock, defaultLayout } from '../components/LayoutBuilder';

const prisma = new PrismaClient();

export default async function Dashboard() {
  const history = await prisma.linkHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const config = await prisma.botConfig.findFirst();
  let initialLayout: LayoutBlock[] = [];
  
  if (config && config.layoutConfig) {
    try {
      initialLayout = config.layoutConfig as unknown as LayoutBlock[];
    } catch (e) {
      initialLayout = defaultLayout;
    }
  } else {
    initialLayout = defaultLayout;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard do Bot</h1>
          <p className="text-gray-500 mt-2">Gerencie as configurações e veja o histórico de links gerados.</p>
        </header>

        <div className="space-y-8">
          
          {/* Configurações do Bot */}
          <LayoutBuilder initialLayout={initialLayout} />

          {/* Histórico de Links */}
          <div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Histórico Recente</h2>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum link gerado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Data</th>
                        <th className="px-4 py-3">Marketplace</th>
                        <th className="px-4 py-3">Link Original</th>
                        <th className="px-4 py-3">Link Afiliado</th>
                        <th className="px-4 py-3 rounded-tr-lg">Usuário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {new Date(item.createdAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <ShoppingBag className="w-3 h-3" />
                              {item.marketplace}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate">
                            <a href={item.originalUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              Original
                            </a>
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate">
                            <a href={item.affiliateUrl} target="_blank" rel="noreferrer" className="text-green-600 hover:underline inline-flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              Afiliado
                            </a>
                          </td>
                          <td className="px-4 py-3 text-gray-500 inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {item.telegramUserId}
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
    </main>
  );
}
