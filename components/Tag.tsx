import React from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { Tag as TagType } from '../types';

interface TagProps {
  tag: TagType;
  onRemove?: () => void;
  selected?: boolean;
  onClick?: () => void;
  showIcon?: boolean;
}

export const Tag: React.FC<TagProps> = ({ 
  tag, 
  onRemove, 
  selected = false, 
  onClick,
  showIcon = false 
}) => {
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-medium transition-all duration-200";
  
  const getStyles = () => {
    if (selected) {
      return "bg-purple-600 text-white hover:bg-purple-700 cursor-pointer";
    }
    if (tag.color) {
      return "text-slate-700 dark:text-slate-300 hover:opacity-90";
    }
    return "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30";
  };
  
  const clickableStyles = onClick ? "cursor-pointer" : "";
  const removeStyles = onRemove ? "cursor-pointer" : "";

  const style = tag.color && !selected 
    ? { backgroundColor: tag.color } 
    : undefined;

  return (
    <span
      className={`${baseStyles} ${getStyles()} ${clickableStyles} ${removeStyles}`}
      onClick={onClick}
      style={style}
    >
      {showIcon && <TagIcon size={14} />}
      <span>{tag.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label={`Remover tag ${tag.name}`}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

