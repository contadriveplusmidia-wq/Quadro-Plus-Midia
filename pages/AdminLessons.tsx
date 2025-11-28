import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, Trash2, GraduationCap, Edit2, Play, GripVertical } from 'lucide-react';

export const AdminLessons: React.FC = () => {
  const { lessons, users, lessonProgress, addLesson, updateLesson, deleteLesson } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const designers = users.filter(u => u.role === 'DESIGNER' && u.active);

  const getLessonStats = (lessonId: string) => {
    const viewedBy = lessonProgress.filter(p => p.lessonId === lessonId && p.viewed);
    return {
      viewedCount: viewedBy.length,
      totalDesigners: designers.length,
      percentage: designers.length > 0 ? Math.round((viewedBy.length / designers.length) * 100) : 0
    };
  };

  const handleSubmit = async () => {
    if (!title || !videoUrl) return;

    if (editingId) {
      await updateLesson(editingId, { title, description, videoUrl });
    } else {
      await addLesson({ title, description, videoUrl });
    }

    setShowModal(false);
    resetForm();
  };

  const handleEdit = (lesson: typeof lessons[0]) => {
    setEditingId(lesson.id);
    setTitle(lesson.title);
    setDescription(lesson.description || '');
    setVideoUrl(lesson.videoUrl);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta aula?')) {
      await deleteLesson(id);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setVideoUrl('');
  };

  const getEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1];
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aulas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as aulas para os designers
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Nova Aula</span>
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <GraduationCap className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nenhuma aula cadastrada
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Clique no botão acima para adicionar uma nova aula
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {lessons.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson, idx) => {
            const stats = getLessonStats(lesson.id);
            const thumbnail = getEmbedUrl(lesson.videoUrl);
            
            return (
              <div 
                key={lesson.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  {thumbnail && (
                    <div className="md:w-48 h-32 md:h-auto bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400">Aula {idx + 1}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                          {lesson.title}
                        </h3>
                        {lesson.description && (
                          <p className="text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(lesson)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(lesson.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {stats.viewedCount}/{stats.totalDesigners} designers
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-600 rounded-full transition-all"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Editar Aula' : 'Nova Aula'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="Ex: Introdução ao Design"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                  placeholder="Descrição da aula..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  URL do Vídeo (YouTube)
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSubmit}
                disabled={!title || !videoUrl}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {editingId ? 'Salvar Alterações' : 'Adicionar Aula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
