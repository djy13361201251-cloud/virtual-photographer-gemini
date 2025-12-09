import React, { useState, useRef, useEffect } from 'react';
import Camera, { CameraHandle } from './components/Camera';
import ControlPanel from './components/ControlPanel';
import Gallery from './components/Gallery';
import { BackgroundOption, PRESET_BACKGROUNDS, GeneratedImage, AppState, CameraSettings, LightingOption, PRESET_LIGHTING } from './types';
import { generateStudioShot } from './services/geminiService';
import { Camera as CameraIcon, Sparkles, X, Download } from 'lucide-react';

export default function App() {
  const cameraRef = useRef<CameraHandle>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // State
  const [selectedBg, setSelectedBg] = useState<BackgroundOption>(PRESET_BACKGROUNDS[0]);
  const [selectedLighting, setSelectedLighting] = useState<LightingOption>(PRESET_LIGHTING[0]);
  
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewedImage, setViewedImage] = useState<GeneratedImage | null>(null);
  
  const [settings, setSettings] = useState<CameraSettings>({
    aspectRatio: '1:1',
    lightingDirection: 'front'
  });
  
  const [activeTab, setActiveTab] = useState<'background' | 'adjustments'>('background');

  const handleCapture = async (originalImageBase64: string) => {
    setAppState(AppState.PROCESSING);
    setErrorMessage(null);

    try {
      const generatedImageBase64 = await generateStudioShot(
        originalImageBase64, 
        selectedBg, 
        selectedLighting, 
        settings
      );

      const newImage: GeneratedImage = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        originalUrl: originalImageBase64,
        generatedUrl: generatedImageBase64,
        timestamp: Date.now(),
        settings: {
          backgroundName: selectedBg.name,
          type: selectedBg.type,
          value: selectedBg.value,
          previewClass: selectedBg.previewClass,
          lightingName: selectedLighting.name,
          lightingDirection: settings.lightingDirection
        },
      };

      setGallery(prev => [newImage, ...prev]);
      setAppState(AppState.SUCCESS);
    } catch (error: any) {
      console.error("Failed:", error);
      setErrorMessage(error.message || "Failed to generate image.");
      setAppState(AppState.ERROR);
    }
  };

  const triggerCapture = () => {
    if (cameraRef.current) {
      setAppState(AppState.CAPTURING);
      setTimeout(() => cameraRef.current?.capture(), 50);
    }
  };

  const handleUpdateSettings = (key: keyof CameraSettings, val: any) => {
      setSettings(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-studio-900 shadow-2xl relative">
      {/* Header */}
      <header className="p-4 flex items-center justify-between bg-studio-900/90 backdrop-blur z-10 sticky top-0 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-studio-accent rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="font-bold text-lg text-white">Instant Studio</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
        {/* Camera */}
        <div className="w-full relative">
           <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl bg-black ring-1 ring-white/10 relative z-0">
            <Camera 
              ref={cameraRef}
              onCapture={handleCapture}
              isProcessing={appState === AppState.PROCESSING}
              aspectRatio={settings.aspectRatio}
            />
          </div>
        </div>

        {/* Capture Button */}
        <div className="flex justify-center -mt-4 relative z-20">
          <button
            onClick={triggerCapture}
            disabled={appState === AppState.PROCESSING || appState === AppState.CAPTURING}
            className={`
              w-20 h-20 rounded-full border-4 border-studio-900 shadow-xl flex items-center justify-center transition-all
              ${appState === AppState.PROCESSING 
                ? 'bg-studio-700 cursor-not-allowed' 
                : 'bg-white hover:bg-gray-100 hover:scale-105 active:scale-95'
              }
            `}
          >
            {appState === AppState.PROCESSING ? (
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CameraIcon size={32} className="text-studio-900" />
            )}
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl text-sm text-center animate-pulse">
            {errorMessage}
          </div>
        )}

        {/* Controls */}
        <div className="bg-studio-800/50 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
          <ControlPanel 
            selectedBg={selectedBg} 
            onSelectBg={setSelectedBg}
            selectedLighting={selectedLighting}
            onSelectLighting={setSelectedLighting}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            disabled={appState === AppState.PROCESSING}
          />
        </div>

        {/* Gallery */}
        <Gallery 
          images={gallery} 
          onRemove={(id) => setGallery(prev => prev.filter(img => img.id !== id))}
          onView={setViewedImage}
        />
        
        <div className="h-8" />
      </main>

      {/* Fullscreen Preview */}
      {viewedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <button 
            onClick={() => setViewedImage(null)} 
            className="absolute top-4 right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
          
          <img 
            src={viewedImage.generatedUrl} 
            alt="Full size" 
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl mb-6"
          />
          
          <div className="flex flex-col items-center gap-2">
             <div className="flex flex-wrap justify-center items-center gap-2 px-4 py-2 bg-studio-800 rounded-full border border-white/10 text-gray-300 text-sm">
                <div 
                  className={`w-3 h-3 rounded-full ${viewedImage.settings.previewClass}`} 
                  style={viewedImage.settings.type === 'solid' ? { backgroundColor: viewedImage.settings.value } : {}}
                />
                <span>{viewedImage.settings.backgroundName}</span>
                {viewedImage.settings.lightingName && (
                  <>
                    <span className="text-gray-600">|</span>
                    <span>{viewedImage.settings.lightingName}</span>
                  </>
                )}
             </div>
             <a 
               href={viewedImage.generatedUrl} 
               download={`studio-shot-${viewedImage.timestamp}.png`}
               className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-100 transition-colors mt-2"
             >
               <Download size={18} /> Save Photo
             </a>
          </div>
        </div>
      )}
    </div>
  );
}