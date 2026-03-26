'use client';

import { useEffect, useState, use } from 'react';
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShoppingBag, ExternalLink, Search } from 'lucide-react';
import Image from 'next/image';

interface StoreData {
  storeName: string;
  storeSlug: string;
  ownerId: string;
}

interface ProductData {
  id: string;
  productTitle: string;
  productImage: string;
  productPrice: number | null;
  affiliateUrl: string;
  marketplace: string;
}

export default function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      try {
        // 1. Find store by slug
        const storesRef = collection(db, 'publicStores');
        const qStore = query(storesRef, where('storeSlug', '==', resolvedParams.slug), firestoreLimit(1));
        const storeSnapshot = await getDocs(qStore);

        if (storeSnapshot.empty) {
          setLoading(false);
          return;
        }

        const storeDoc = storeSnapshot.docs[0];
        const storeData = storeDoc.data() as StoreData;
        setStore(storeData);

        // 2. Fetch products for this store
        const productsRef = collection(db, 'publicStores', storeDoc.id, 'products');
        const qProducts = query(productsRef, orderBy('createdAt', 'desc'), firestoreLimit(100));
        const productsSnapshot = await getDocs(qProducts);
        
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ProductData[];
        
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching store data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreAndProducts();
  }, [resolvedParams.slug]);

  const filteredProducts = products.filter(product => 
    product.productTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fe] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004ac6]"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-[#f7f9fe] flex flex-col items-center justify-center p-4">
        <ShoppingBag className="w-16 h-16 text-[#c3c6d7] mb-4" />
        <h1 className="text-3xl font-bold text-[#181c20] mb-2 tracking-tight">Catálogo não encontrado</h1>
        <p className="text-[#4a4a4a] text-lg">O catálogo que você está procurando não existe ou foi removido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fe] font-sans">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white pt-20 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{store.storeName}</h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            As melhores ofertas selecionadas para você.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 pb-20">
        
        {/* Search Bar */}
        <div className="mb-12 relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[#4a4a4a]" />
          </div>
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border-none rounded-2xl shadow-[0_16px_48px_rgba(24,28,32,0.06)] focus:ring-2 focus:ring-[#004ac6] outline-none transition-all text-[#181c20] text-lg"
          />
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-[0_16px_48px_rgba(24,28,32,0.04)]">
            <div className="w-20 h-20 bg-[#f1f4f9] rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-[#c3c6d7]" />
            </div>
            <h3 className="text-2xl font-bold text-[#181c20] mb-3 tracking-tight">Nenhum produto encontrado</h3>
            <p className="text-[#4a4a4a] text-lg">
              {searchTerm ? 'Tente buscar com outras palavras.' : 'Este catálogo ainda não possui produtos.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-3xl shadow-[0_8px_32px_rgba(24,28,32,0.04)] overflow-hidden flex flex-col hover:shadow-[0_16px_48px_rgba(24,28,32,0.08)] transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative aspect-square bg-[#f1f4f9]">
                  {product.productImage ? (
                    <Image
                      src={product.productImage}
                      alt={product.productTitle || 'Produto'}
                      fill
                      className="object-cover mix-blend-multiply"
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-[#c3c6d7]" />
                    </div>
                  )}
                  {product.marketplace && (
                    <div className="absolute top-4 right-4 px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full text-xs font-bold text-[#181c20] tracking-wide uppercase shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                      {product.marketplace}
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-[#181c20] font-bold text-lg leading-tight line-clamp-2 mb-4 flex-1 tracking-tight">
                    {product.productTitle || 'Produto sem título'}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-transparent">
                    <div>
                      {product.productPrice ? (
                        <span className="text-2xl font-bold text-[#004ac6]">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.productPrice)}
                        </span>
                      ) : (
                        <span className="text-sm text-[#4a4a4a] font-medium">Preço indisponível</span>
                      )}
                    </div>
                    
                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-gradient-to-br from-[#004ac6] to-[#2563eb] hover:from-[#003da3] hover:to-[#1d4ed8] text-white rounded-full flex items-center justify-center transition-all shadow-[0_4px_12px_rgba(0,74,198,0.2)] hover:shadow-[0_8px_24px_rgba(0,74,198,0.3)]"
                      title="Ver oferta"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
