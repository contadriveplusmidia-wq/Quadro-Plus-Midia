import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Link2, Plus, X, Trash2, Edit2, Upload, ExternalLink, Globe, AlertCircle, Tag as TagIcon, Settings } from 'lucide-react';
import { UsefulLink, Tag } from '../types';
import { Tag as TagComponent } from '../components/Tag';

export const AdminLinks: React.FC = () => {
  const { usefulLinks, addUsefulLink, updateUsefulLink, deleteUsefulLink, tags, addTag, updateTag, deleteTag } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para gerenciamento de tags
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('');
  const [tagError, setTagError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      setError('Imagem muito grande. Use uma imagem menor que 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim()) {
      setError('Preencha o título e a URL');
      return;
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      setError('URL inválida. Use o formato completo (ex: https://exemplo.com)');
      return;
    }

    setError('');
    setSaving(true);

    try {
      if (editingLink) {
        await updateUsefulLink(editingLink.id, {
          title: title.trim(),
          url: url.trim(),
          imageUrl: imageUrl || undefined,
          tagIds: selectedTagIds
        } as any);
      } else {
        const success = await addUsefulLink({
          title: title.trim(),
          url: url.trim(),
          imageUrl: imageUrl || undefined,
          tagIds: selectedTagIds
        } as any);
        if (!success) {
          setError('Erro ao salvar link. Verifique se a tabela useful_links existe no banco de dados.');
          setSaving(false);
          return;
        }
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError('Erro ao salvar link. Tente novamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (link: UsefulLink) => {
    setEditingLink(link);
    setTitle(link.title);
    setUrl(link.url);
    setImageUrl(link.imageUrl || '');
    setSelectedTagIds(link.tags?.map(t => t.id) || []);
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este link?')) {
      await deleteUsefulLink(id);
    }
  };

  const resetForm = () => {
    setEditingLink(null);
    setTitle('');
    setUrl('');
    setImageUrl('');
    setSelectedTagIds([]);
    setError('');
  };
  
  // Funções para gerenciamento de tags
  const handleTagSubmit = async () => {
    if (!tagName.trim()) {
      setTagError('Nome da tag é obrigatório');
      return;
    }
    
    setTagError('');
    try {
      if (editingTag) {
        await updateTag(editingTag.id, {
          name: tagName.trim(),
          color: tagColor || undefined
        });
      } else {
        await addTag({
          name: tagName.trim(),
          color: tagColor || undefined
        });
      }
      resetTagForm();
      setShowTagsModal(false);
    } catch (err: any) {
      setTagError(err.message || 'Erro ao salvar tag');
    }
  };
  
  const handleTagEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || '');
    setTagError('');
    setShowTagsModal(true);
  };
  
  const handleTagDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tag? Todos os links associados perderão esta tag.')) {
      await deleteTag(id);
    }
  };
  
  const resetTagForm = () => {
    setEditingTag(null);
    setTagName('');
    setTagColor('');
    setTagError('');
  };
  
  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getDomain = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.hostname.replace('www.', '');
    } catch {
      return urlString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Links Úteis</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie links úteis para os designers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetTagForm();
              setShowTagsModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            <TagIcon size={20} />
            <span>Gerenciar Tags</span>
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>Novo Link</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-200 dark:bg-indigo-800 rounded-xl">
            <Globe className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{usefulLinks.length}</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">Links cadastrados</p>
          </div>
        </div>
      </div>

      {/* Lista de links */}
      {usefulLinks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Link2 className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nenhum link cadastrado
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Clique no botão acima para adicionar o primeiro link
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {usefulLinks.map(link => (
            <div
              key={link.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-lg transition-shadow"
            >
              {link.imageUrl ? (
                <div className="h-36 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <img 
                    src={link.imageUrl} 
                    alt={link.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ) : (
                <div className="h-36 bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                  <Globe className="text-white/30" size={64} />
                </div>
              )}

              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate">
                  {link.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                  <Link2 size={14} />
                  {getDomain(link.url)}
                </p>
                
                {/* Tags do link */}
                {link.tags && link.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {link.tags.map(tag => (
                      <TagComponent key={tag.id} tag={tag} />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink size={16} />
                    Abrir
                  </a>
                  <button
                    onClick={() => handleEdit(link)}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Link2 className="text-indigo-600 dark:text-indigo-400" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {editingLink ? 'Editar Link' : 'Novo Link'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  placeholder="Ex: Canva Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  placeholder="https://exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Imagem/Thumbnail (opcional)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="text-slate-400 mb-2" size={32} />
                      <span className="text-sm text-slate-500">Clique para fazer upload</span>
                      <span className="text-xs text-slate-400 mt-1">Máx. 500KB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="mt-2 text-xs text-red-500 hover:text-red-600"
                  >
                    Remover imagem
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !url.trim() || saving}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Link2 size={20} />
                {saving ? 'Salvando...' : (editingLink ? 'Atualizar Link' : 'Adicionar Link')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Gerenciamento de Tags */}
      {showTagsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <TagIcon className="text-indigo-600 dark:text-indigo-400" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Gerenciar Tags
                </h2>
              </div>
              <button onClick={() => { setShowTagsModal(false); resetTagForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Formulário de Tag */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {editingTag ? 'Editar Tag' : 'Nova Tag'}
                </h3>
                {tagError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={18} />
                    <span>{tagError}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    placeholder="Nome da tag"
                  />
                  <input
                    type="color"
                    value={tagColor || '#ECE6FF'}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-16 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Cor da tag"
                  />
                  <button
                    onClick={handleTagSubmit}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                  >
                    {editingTag ? 'Atualizar' : 'Criar'}
                  </button>
                  {editingTag && (
                    <button
                      onClick={resetTagForm}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Tags */}
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Tags Existentes</h3>
                {tags.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    Nenhuma tag criada ainda
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <TagComponent tag={tag} />
                        <button
                          onClick={() => handleTagEdit(tag)}
                          className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleTagDelete(tag.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
