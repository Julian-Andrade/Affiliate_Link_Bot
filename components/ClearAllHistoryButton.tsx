'use client';

import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from './AuthProvider';

export default function ClearAllHistoryButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useAuth();

  const handleDeleteAll = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const historyRef = collection(db, 'users', user.uid, 'linkHistory');
      const snapshot = await getDocs(historyRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error: any) {
      console.error(error.message || 'Erro ao limpar histórico');
    }
    setIsDeleting(false);
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-md border border-red-100">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">Excluir tudo?</span>
        <button
          onClick={handleDeleteAll}
          disabled={isDeleting}
          className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isDeleting ? 'Limpando...' : 'Sim'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      Limpar Histórico
    </button>
  );
}
