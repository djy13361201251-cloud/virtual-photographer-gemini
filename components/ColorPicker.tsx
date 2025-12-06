import React from 'react';
import { BackgroundOption, PRESET_BACKGROUNDS } from '../types';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedBg: BackgroundOption;
  onSelectBg: (bg: BackgroundOption) => void;
  disabled: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedBg, onSelectBg, disabled }) => {
  return (
    <div className="w-full">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Studio Background</h3>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {PRESET_BACKGROUNDS.map((bg) => {
          const isSelected = selectedBg.id === bg.id;
          return (
            <button
              key={bg.id}
              onClick={() => onSelectBg(bg)}
              disabled={disabled}
              className={`
                group relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-200
                ${isSelected ? 'ring-2 ring-offset-2 ring-offset-studio-900 ring-studio-accent scale-105' : 'hover:scale-95'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className={`w-full h-full ${bg.previewClass}`} />
              
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check size={16} className="text-white drop-shadow-md" />
                </div>
              )}
              
              <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm py-1">
                <p className="text-[9px] text-center text-white/90 font-medium truncate px-1">
                  {bg.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPicker;