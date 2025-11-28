import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, Trash2, MessageSquare, Eye, EyeOff, ChevronDown, Upload, Image } from 'lucide-react';

export const AdminFeedbacks: React.FC = () => {
  const { currentUser, users, feedbacks, addFeedback, deleteFeedback } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [filterDesigner, setFilterDesigner] = useState('all');

  const designers = users.filter(u => u.role === 'DESIGNER' && u.active);

  const filteredFeedbacks = filterDesigner === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.designerId === filterDesigner);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedDesigner || !currentUser) return;

    const designer = designers.find(d => d.id === selectedDesigner);
    if (!designer) return;

    await addFeedback({
      designerId: selectedDesigner,
      designerName: designer.name,
      adminName: currentUser.name,
      imageUrls: images,
      comment
    });

    setShowModal(false);
    setSelectedDesigner('');
    setComment('');
    setImages([]);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este feedback?')) {
      await deleteFeedback(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feedbacks</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Envie feedbacks visuais para os designers
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <select
              value={filterDesigner}
              onChange={(e) => setFilterDesigner(e.target.value)}
              className="pl-4 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none"
            >
              <option value="all">Todos Designers</option>
              {designers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Novo Feedback</span>
          </button>
        </div>
      </div>

      {filteredFeedbacks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <MessageSquare className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nenhum feedback ainda
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Clique no botão acima para enviar um feedback
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFeedbacks.map(feedback => (
            <div 
              key={feedback.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{feedback.designerName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(feedback.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      feedback.viewed 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                    }`}>
                      {feedback.viewed ? <Eye size={14} /> : <EyeOff size={14} />}
                      {feedback.viewed ? 'Visto' : 'Não visto'}
                    </span>
                    <button
                      onClick={() => handleDelete(feedback.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {feedback.comment && (
                  <p className="text-slate-700 dark:text-slate-300 mb-4">{feedback.comment}</p>
                )}

                {feedback.imageUrls && feedback.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {feedback.imageUrls.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800"
                      >
                        <img src={url} alt={`Imagem ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Novo Feedback</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Designer
                </label>
                <div className="relative">
                  <select
                    value={selectedDesigner}
                    onChange={(e) => setSelectedDesigner(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {designers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Comentário (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="Escreva seu feedback..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Imagens (opcional)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <Upload className="text-slate-400 mb-2" size={32} />
                  <span className="text-sm text-slate-500">Clique para fazer upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSubmit}
                disabled={!selectedDesigner}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                Enviar Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
