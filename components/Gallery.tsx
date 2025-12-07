
import React from 'react';
import { GeneratedImage } from '../types';
import { Download, Eye, Trash2 } from 'lucide-react';

interface GalleryProps {
  images: GeneratedImage[];
  onRemove: (id: string) => void;
  onView: (image: GeneratedImage) => void;
}

const Gallery: React.FC<GalleryProps> = ({ images, onRemove, onView }) => {
  if (images.length === 0) return null;

  return (
    <div className="w-full mt-6">
      <div className="flex items-center justify-between mb-3 px-1">
         <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Recent Shots</p>
         <span className="text-xs text-gray-500">{images.length} photos</span>
      </div>
      
      {/* Changed from flex/horizontal-scroll to grid/vertical-flow */}
      <div className="grid grid-cols-2 gap-3 px-1 pb-4">
        {images.map((img) => (
          <div 
            key={img.id} 
            className="relative w-full aspect-square rounded-xl overflow-hidden group border border-studio-700 shadow-lg transition-transform active:scale-95 bg-studio-800"
          >
            <img 
              src={img.generatedUrl} 
              alt="Generated product shot" 
              className="w-full h-full object-cover"
            />
            
            {/* Color indicator badge */}
            <div 
              className={`absolute top-2 left-2 w-4 h-4 rounded-full border border-white/20 shadow-sm ${img.settings.previewClass || ''}`}
              style={img.settings.type === 'solid' ? { backgroundColor: img.settings.value } : {}}
              title={img.settings.backgroundName}
            />

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => onView(img)}
                className="p-2.5 bg-blue-500 hover:bg-blue-600 rounded-full text-white shadow-lg transition-colors"
                title="View Fullscreen"
              >
                <Eye size={18} />
              </button>
              
              <a 
                href={img.generatedUrl} 
                download={`studio-shot-${img.timestamp}.png`}
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                title="Download"
              >
                <Download size={18} />
              </a>
              
               <button
                onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                className="p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-200 backdrop-blur-sm transition-colors"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery;
