
import React, { useRef, useState, useEffect } from 'react';
import { BackgroundOption, PRESET_BACKGROUNDS, CameraSettings, AspectRatio, PRESET_LIGHTING, LightingOption, LightingDirection } from '../types';
import { Upload, Sliders, Palette, Ratio, Lightbulb, Move } from 'lucide-react';

interface ControlPanelProps {
  selectedBg: BackgroundOption;
  onSelectBg: (bg: BackgroundOption) => void;
  selectedLighting: LightingOption;
  onSelectLighting: (light: LightingOption) => void;
  settings: CameraSettings;
  onUpdateSettings: (key: keyof CameraSettings, val: any) => void;
  activeTab: 'background' | 'adjustments';
  setActiveTab: (tab: 'background' | 'adjustments') => void;
  disabled: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  selectedBg, 
  onSelectBg, 
  selectedLighting,
  onSelectLighting,
  settings,
  onUpdateSettings,
  activeTab,
  setActiveTab,
  disabled 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Color Picker State (HSV Model)
  const [hue, setHue] = useState(0); // 0-360
  const [saturation, setSaturation] = useState(0); // 0-100 (HSV Saturation)
  const [value, setValue] = useState(100); // 0-100 (HSV Value)
  const pickerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // HSV to Hex helper
  const hsvToHex = (h: number, s: number, v: number) => {
    // s and v are 0-1
    const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    const r = f(5);
    const g = f(3);
    const b = f(1);
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleColorUpdate = (newHue: number, newSat: number, newVal: number) => {
    const hex = hsvToHex(newHue, newSat / 100, newVal / 100);
    onSelectBg({
      id: 'custom-solid',
      name: 'Solid Color',
      type: 'solid',
      value: hex,
      previewClass: '', // Dynamic style handling
    });
  };

  const handlePickerInteraction = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!pickerRef.current) return;
    const rect = pickerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    // Map geometric position to HSV
    // x axis = Saturation
    // y axis = 1 - Value
    const newSat = Math.round(x * 100);
    const newVal = Math.round((1 - y) * 100); 
    
    setSaturation(newSat);
    setValue(newVal);
    handleColorUpdate(hue, newSat, newVal);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    handlePickerInteraction(e);
  };

  useEffect(() => {
    const handleUp = () => isDragging.current = false;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging.current) {
        e.preventDefault(); // Prevent scrolling on touch
        handlePickerInteraction(e);
      }
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [hue]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onSelectBg({
          id: 'custom-upload',
          name: 'Custom Image',
          type: 'image',
          value: 'custom image background',
          imageSrc: base64,
          previewClass: 'bg-gray-800'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const ratios: AspectRatio[] = ['1:1', '3:4', '4:3', '16:9', '9:16'];
  const currentColorHex = hsvToHex(hue, saturation / 100, value / 100);

  const LightDirBtn = ({ dir, rotate, label }: { dir: LightingDirection, rotate: number, label?: string }) => (
    <button
      onClick={() => onUpdateSettings('lightingDirection', dir)}
      className={`
        w-full aspect-square rounded-lg flex items-center justify-center transition-all border
        ${settings.lightingDirection === dir 
          ? 'bg-studio-accent border-studio-accent text-white shadow-lg' 
          : 'bg-studio-800 border-studio-700 text-gray-500 hover:bg-studio-700 hover:text-white'}
      `}
      title={dir}
    >
      {label || <Move size={16} style={{ transform: `rotate(${rotate}deg)` }} />}
    </button>
  );

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-studio-800 rounded-xl">
        <button
          onClick={() => setActiveTab('background')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'background' ? 'bg-studio-700 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Palette size={16} />
          Studio
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'adjustments' ? 'bg-studio-700 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sliders size={16} />
          Options
        </button>
      </div>

      <div className="min-h-[120px]">
        {activeTab === 'background' ? (
          <div className="flex flex-col gap-4">
            
            {/* Lighting Selection */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-medium">
                  <span className="flex items-center gap-1"><Lightbulb size={12} className="text-yellow-400"/> Lighting Effect</span>
                  <span className="text-white">{selectedLighting.name}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
                 {PRESET_LIGHTING.map(light => (
                   <button
                    key={light.id}
                    onClick={() => onSelectLighting(light)}
                    disabled={disabled}
                    className={`
                      flex-none px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium transition-all snap-start border
                      ${selectedLighting.id === light.id 
                        ? 'bg-studio-700 border-studio-accent text-white shadow-lg' 
                        : 'bg-studio-800 border-studio-800 text-gray-400 hover:bg-studio-700 hover:border-studio-600'}
                    `}
                   >
                     <span>{light.icon}</span>
                     {light.name}
                   </button>
                 ))}
              </div>
            </div>

            <div className="w-full h-px bg-white/5 my-1" />

            {/* Color Gamut Joystick & Presets */}
            <div className="space-y-3">
               <div className="flex justify-between items-center text-xs text-gray-400 uppercase tracking-wider font-medium">
                  <span className="flex items-center gap-1">Background Color</span>
                  {/* Texture/Upload Toggles */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${selectedBg.type === 'image' ? 'border-studio-accent bg-studio-700 text-white' : 'border-studio-600 text-gray-400'}`}
                      title="Upload Image"
                    >
                      <Upload size={12} />
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                    </button>
                    {PRESET_BACKGROUNDS.map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => onSelectBg(bg)}
                        className={`w-6 h-6 rounded-full border overflow-hidden transition-all ${selectedBg.id === bg.id ? 'border-studio-accent scale-110 ring-1 ring-studio-accent' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        title={bg.name}
                      >
                        <div className={`w-full h-full ${bg.previewClass}`} />
                      </button>
                    ))}
                  </div>
               </div>

               {/* 2D Color Field (Saturation / Value) */}
               <div 
                 ref={pickerRef}
                 onMouseDown={handleMouseDown}
                 onTouchStart={(e) => { isDragging.current = true; handlePickerInteraction(e); }}
                 className={`
                    w-full h-32 rounded-xl cursor-crosshair relative shadow-inner overflow-hidden touch-none
                    ${disabled ? 'opacity-50 pointer-events-none' : ''}
                 `}
                 style={{
                   backgroundColor: `hsl(${hue}, 100%, 50%)`,
                   backgroundImage: `
                     linear-gradient(to right, #fff 0%, transparent 100%),
                     linear-gradient(to bottom, transparent 0%, #000 100%)
                   `
                 }}
               >
                  {/* Selector Nub */}
                  <div 
                    className="absolute w-5 h-5 border-2 border-white rounded-full shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${saturation}%`,
                      top: `${100 - value}%`,
                      backgroundColor: currentColorHex
                    }}
                  />
               </div>

               {/* Hue Slider */}
               <input 
                 type="range" 
                 min="0" 
                 max="360" 
                 value={hue}
                 disabled={disabled}
                 onChange={(e) => {
                    const h = Number(e.target.value);
                    setHue(h);
                    handleColorUpdate(h, saturation, value);
                 }}
                 className="w-full h-3 rounded-full appearance-none cursor-pointer"
                 style={{
                   background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                 }}
               />
            </div>

          </div>
        ) : (
          <div className="space-y-6 px-1">
            
            {/* Aspect Ratio Selector */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-medium">
                <span className="flex items-center gap-1"><Ratio size={14} className="text-studio-accent" /> Aspect Ratio</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {ratios.map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => onUpdateSettings('aspectRatio', ratio)}
                    className={`
                      py-2.5 rounded-lg text-[10px] font-bold transition-all border
                      ${settings.aspectRatio === ratio 
                        ? 'bg-studio-accent border-studio-accent text-white shadow-lg' 
                        : 'bg-studio-800 border-studio-700 text-gray-400 hover:bg-studio-700 hover:text-white'}
                    `}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/5 w-full my-4" />

            {/* Light Direction Grid */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-medium">
                <span className="flex items-center gap-1"><Lightbulb size={14} className="text-yellow-400" /> Light Source</span>
                <span className="text-white capitalize">{settings.lightingDirection.replace('-', ' ')}</span>
              </div>
              
              <div className="w-full max-w-[200px] mx-auto grid grid-cols-3 gap-2">
                 {/* Top Row */}
                 <LightDirBtn dir="top-left" rotate={-45} />
                 <LightDirBtn dir="top" rotate={-90} />
                 <LightDirBtn dir="top-right" rotate={-135} />
                 
                 {/* Middle Row */}
                 <LightDirBtn dir="left" rotate={0} />
                 <LightDirBtn dir="front" rotate={0} label="⦿" />
                 <LightDirBtn dir="right" rotate={180} />
                 
                 {/* Bottom Row */}
                 <button className="invisible"></button> {/* Placeholder to keep grid shape if needed or can add bottom lights */}
                 <LightDirBtn dir="bottom" rotate={90} />
                 <button className="invisible"></button>
              </div>
              <p className="text-[10px] text-center text-gray-500 mt-2">Tap to position the main light source</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
