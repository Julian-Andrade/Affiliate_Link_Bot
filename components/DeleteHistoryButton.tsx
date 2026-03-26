'use client';

import { Trash2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

export default function DeleteHistoryButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'linkHistory', id));
      // Also attempt to delete from public store
      try {
        await deleteDoc(doc(db, 'publicStores', user.uid, 'products', id));
      } catch (e) {
        // Ignore if it doesn't exist or fails
      }
      toast.success('Item excluído com sucesso!');
    } catch (error: any) {
      console.error(error.message || 'Erro ao excluir item');
      toast.error('Erro ao excluir item.');
    }
    setIsDeleting(false);
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 p-1 bg-green-50 rounded"
          title="Confirmar exclusão"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 p-1 bg-gray-50 rounded"
          title="Cancelar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-red-500 hover:text-red-700 transition-colors p-1"
      title="Excluir item"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
