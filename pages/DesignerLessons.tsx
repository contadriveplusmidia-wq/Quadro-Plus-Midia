import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GraduationCap, Play, CheckCircle, Circle, X } from 'lucide-react';

export const DesignerLessons: React.FC = () => {
  const { currentUser, lessons, lessonProgress, markLessonViewed, unmarkLessonViewed } = useApp();
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const isLessonViewed = (lessonId: string) => {
    return lessonProgress.some(p => p.lessonId === lessonId && p.viewed);
  };

  const viewedCount = lessons.filter(l => isLessonViewed(l.id)).length;
  const progress = lessons.length > 0 ? Math.round((viewedCount / lessons.length) * 100) : 0;

  const handleWatch = async (lessonId: string) => {
    setSelectedLesson(lessonId);
    if (currentUser && !isLessonViewed(lessonId)) {
      await markLessonViewed(lessonId, currentUser.id);
    }
  };

  const handleUnmark = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser) {
      await unmarkLessonViewed(lessonId, currentUser.id);
    }
  };

  const getEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const getYoutubeThumbnail = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1];
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  // Obter thumbnail automática do YouTube
  const getLessonThumbnail = (lesson: typeof lessons[0]) => {
    return getYoutubeThumbnail(lesson.videoUrl);
  };

  const currentLesson = lessons.find(l => l.id === selectedLesson);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aulas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {viewedCount} de {lessons.length} aulas assistidas
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progresso</span>
          <span className="text-sm font-bold text-brand-600">{progress}%</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <GraduationCap className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nenhuma aula disponível
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            As aulas adicionadas pelo administrador aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {lessons.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson, idx) => {
            const viewed = isLessonViewed(lesson.id);
            const thumbnail = getLessonThumbnail(lesson);
            
            return (
              <div 
                key={lesson.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div 
                    className="sm:w-60 h-36 sm:h-auto bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative group cursor-pointer"
                    onClick={() => handleWatch(lesson.id)}
                  >
                    {thumbnail ? (
                      <img 
                        src={thumbnail} 
                        alt={lesson.title} 
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700">
                        <Play size={40} className="text-white/80" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={24} className="text-brand-600 ml-1" />
                      </div>
                    </div>
                    {viewed && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                        <CheckCircle size={16} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-6">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (viewed && currentUser) {
                            handleUnmark(lesson.id, e);
                          }
                        }}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                          viewed 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 dark:hover:bg-green-900/50 cursor-pointer' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                        }`}
                        disabled={!viewed}
                        title={viewed ? 'Clique para desmarcar como assistida' : ''}
                      >
                        {viewed ? <CheckCircle size={24} /> : <Circle size={24} />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400">Aula {idx + 1}</span>
                          {viewed && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 text-xs font-medium rounded-full">
                              Assistida
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                          {lesson.title}
                        </h3>
                        {lesson.description && (
                          <p className="text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{lesson.description}</p>
                        )}
                        <button
                          onClick={() => handleWatch(lesson.id)}
                          className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                        >
                          <Play size={18} />
                          {viewed ? 'Assistir Novamente' : 'Assistir'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedLesson && currentLesson && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">{currentLesson.title}</h3>
              <button 
                onClick={() => setSelectedLesson(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                src={getEmbedUrl(currentLesson.videoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
