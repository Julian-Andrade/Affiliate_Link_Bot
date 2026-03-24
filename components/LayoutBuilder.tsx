'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, Info } from 'lucide-react';
import { updateBotConfig } from '../app/actions';

export type BlockType = 'title' | 'customCta' | 'customText' | 'promoPrice' | 'originalPrice' | 'affiliateLink' | 'coupon' | 'promoWarning' | 'salesCount';

export interface LayoutBlock {
  id: string;
  type: BlockType;
  label: string;
  enabled: boolean;
  value?: string;
}

export const defaultLayout: LayoutBlock[] = [
  { id: 'title', type: 'title', label: 'Título', enabled: true },
  { id: 'customCta', type: 'customCta', label: 'Digite seu CTA personalizado', enabled: false, value: '👉 Link p/ comprar:' },
  { id: 'customText', type: 'customText', label: 'Digite seu texto personalizado', enabled: false, value: '' },
  { id: 'promoPrice', type: 'promoPrice', label: 'Preço promocional', enabled: true },
  { id: 'originalPrice', type: 'originalPrice', label: 'Preço cheio', enabled: true },
  { id: 'affiliateLink', type: 'affiliateLink', label: 'Link de afiliado', enabled: true },
  { id: 'coupon', type: 'coupon', label: 'Digite seu Cupom de desconto', enabled: false, value: '' },
  { id: 'promoWarning', type: 'promoWarning', label: 'Aviso de promoção', enabled: false },
  { id: 'salesCount', type: 'salesCount', label: 'Quantidade de vendas', enabled: false }
];

interface SortableItemProps {
  block: LayoutBlock;
  onChange: (id: string, updates: Partial<LayoutBlock>) => void;
}

function SortableItem({ block, onChange }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasInput = ['customCta', 'customText', 'coupon'].includes(block.type);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
      <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{block.label}</span>
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(block.id, { enabled: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        </div>
        
        {hasInput && block.enabled && (
          <input
            type="text"
            value={block.value || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(block.id, { value: e.target.value })}
            placeholder="Digite aqui..."
            className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        )}
      </div>
    </div>
  );
}

export default function LayoutBuilder({ initialLayout }: { initialLayout: LayoutBlock[] }) {
  const [blocks, setBlocks] = useState<LayoutBlock[]>(initialLayout.length > 0 ? initialLayout : defaultLayout);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleBlockChange = (id: string, updates: Partial<LayoutBlock>) => {
    setBlocks((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('layoutConfig', JSON.stringify(blocks));
      const response = await updateBotConfig(formData);
      if (response && !response.success) {
        throw new Error(response.error || 'Erro desconhecido');
      }
      window.alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      window.alert('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  // Preview Generator
  const renderPreview = () => {
    return blocks.filter(b => b.enabled).map(block => {
      switch (block.type) {
        case 'title':
          return <p key={block.id} className="font-bold text-gray-900">🛍️ Smartwatch Relógio Ultra 2 Pro</p>;
        case 'customCta':
          return <p key={block.id} className="text-gray-800">{block.value} <a href="#" className="text-blue-600 break-all">https://shopee.com.br/seu-link</a></p>;
        case 'customText':
          return <p key={block.id} className="text-gray-600 whitespace-pre-wrap">{block.value}</p>;
        case 'promoPrice':
          return <p key={block.id} className="text-green-600 font-bold">💸 por R$ 89,99 🚨🚨</p>;
        case 'originalPrice':
          return <p key={block.id} className="text-gray-500 line-through">De: R$ 189,99</p>;
        case 'affiliateLink':
          return <p key={block.id} className="text-blue-600">🔗 Link: https://shopee.com.br/seu-link</p>;
        case 'coupon':
          return <p key={block.id} className="font-bold">🎟️ Cupom: {block.value}</p>;
        case 'promoWarning':
          return <p key={block.id} className="text-red-600 font-bold">🚨 OFERTA IMPERDÍVEL 🚨</p>;
        case 'salesCount':
          return <p key={block.id} className="text-gray-500 text-sm">🔥 +1000 vendidos</p>;
        default:
          return null;
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Definição de Layout</h2>
          <p className="text-sm text-gray-500 mt-1">Personalize as informações que aparecerão nas mensagens geradas.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Editor */}
        <div className="p-6 bg-gray-50/50 border-r border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>INFORMAÇÕES DO CARD</span>
              <Info className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-200 px-2 py-1 rounded-full">
              REORDENAR
            </span>
          </div>

          {isMounted ? (
            <DndContext
              id="dnd-layout-builder"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {blocks.map((block) => (
                    <SortableItem key={block.id} block={block} onChange={handleBlockChange} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-1">
              {blocks.map((block) => (
                <div key={block.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2 opacity-50">
                  <div className="text-gray-400">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{block.label}</span>
                      <input
                        type="checkbox"
                        checked={block.enabled}
                        readOnly
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="p-6 bg-gray-100 flex flex-col items-center">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">
            PREVIEW
          </div>
          
          <div className="w-full max-w-sm bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=400&h=400" 
                alt="Product Illustration" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 space-y-2 text-sm">
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
