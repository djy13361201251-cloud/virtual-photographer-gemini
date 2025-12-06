import React, { useState, useRef, useEffect } from 'react';
import Camera, { CameraHandle } from './components/Camera';
import ControlPanel from './components/ControlPanel';
import Gallery from './components/Gallery';
import { BackgroundOption, PRESET_BACKGROUNDS, GeneratedImage, AppState, CameraSettings, LightingOption, PRESET_LIGHTING } from './types';
import { generateStudioShot } from './services/geminiService';
import { Camera as CameraIcon, Sparkles, X, Download, Key, ExternalLink, ArrowRight } from 'lucide-react';

export default function App() {
  const cameraRef = useRef<CameraHandle>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // State
  const [selectedBg, setSelectedBg] = useState<BackgroundOption>(PRESET_BACKGROUNDS[0]);
  const [selectedLighting, setSelectedLighting] = useState<LightingOption>(PRESET_LIGHTING[0]);
  
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewedImage, setViewedImage] = useState<GeneratedImage | null>(null);
  
  // Auth State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [manualApiKey, setManualApiKey] = useState("");
  const [isAIStudioEnv, setIsAIStudioEnv] = useState(false);
  
  const [settings, setSettings] = useState<CameraSettings>({
    aspectRatio: '1:1',
    lightingDirection: 'front'
  });
  
  const [activeTab, setActiveTab] = useState<'background' | 'adjustments'>('background');

  useEffect(() => {
    // Check environment
    const isAIStudio = typeof window !== 'undefined' && (window as any).aistudio;
    setIsAIStudioEnv(!!isAIStudio);

    const checkKey = async () => {
      try {
        if (isAIStudio && (window as any).aistudio.hasSelectedApiKey) {
            const has = await (window as any).aistudio.hasSelectedApiKey();
            setHasApiKey(has);
        } else {
            // Standalone mode: User must enter key manually
            setHasApiKey(false);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
        setHasApiKey(false);
      }
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      try {
        await (window as any).aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e: any) {
        console.error("Key selection failed:", e);
        setHasApiKey(false);
      }
    }
  };

  const handleManualKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualApiKey.trim().length > 10) {
      setHasApiKey(true);
    }
  };

  const handleCapture = async (originalImageBase64: string) => {
    setAppState(AppState.PROCESSING);
    setErrorMessage(null);

    try {
      // Pass the manualApiKey if set, otherwise the service will use process.env.API_KEY (injected by AI Studio)
      const generatedImageBase64 = await generateStudioShot(
        originalImageBase64, 
        selectedBg, 
        selectedLighting, 
        settings,
        manualApiKey || undefined // Explicitly pass undefined if empty to trigger env fallback in service
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
      
      // Handle "Requested entity was not found" (Key expired/invalid)
      if (error.message && error.message.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setErrorMessage("API Key invalid or expired. Please check your key.");
      } else if (error.message && error.message.includes("API key not valid")) {
        setHasApiKey(false);
        setErrorMessage("Invalid API Key provided.");
      } else {
        setErrorMessage(error.message || "Failed to generate image.");
      }
      
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

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-studio-900 text-white p-6 text-center">
        <div className="max-w-md w-full bg-studio-800 p-8 rounded-2xl border border-white/5 shadow-2xl flex flex-col items-center">
          <Sparkles size={48} className="text-studio-accent mb-6 animate-pulse" />
          <h1 className="text-3xl font-bold mb-2">Instant Studio AI</h1>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Generate professional 4K product photography instantly. 
            <br/>To verify your identity and manage quotas, please provide a Google Gemini API Key.
          </p>
          
          {isAIStudioEnv ? (
            <button 
              onClick={handleConnectKey} 
              className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-100 transition-transform active:scale-95 shadow-lg mb-6 flex items-center justify-center gap-2"
            >
              <Key size={20} />
              Select API Key
            </button>
          ) : (
            <form onSubmit={handleManualKeySubmit} className="w-full mb-6">
               <div className="relative mb-4 group">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Key size={16} />
                 </div>
                 <input 
                   type="password"
                   value={manualApiKey}
                   onChange={(e) => setManualApiKey(e.target.value)}
                   placeholder="Paste your Gemini API Key"
                   className="w-full pl-10 pr-4 py-4 bg-studio-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-studio-accent focus:ring-1 focus:ring-studio-accent transition-all"
                   required
                 />
               </div>
               <button 
                type="submit"
                disabled={manualApiKey.length < 10}
                className="w-full py-4 bg-white disabled:bg-gray-600 disabled:text-gray-400 text-black rounded-xl font-bold text-lg hover:bg-gray-100 transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                Start Studio <ArrowRight size={20} />
              </button>
            </form>
          )}

          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-studio-accent hover:underline opacity-80"
          >
            Get an API Key <ExternalLink size={10} />
          </a>
          <p className="text-[10px] text-gray-500 mt-2 max-w-xs mx-auto">
             Note: Your key is used locally for this session only and is never stored on our servers.
          </p>
        </div>
      </div>
    );
  }

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
        <button 
            onClick={() => {
               if (isAIStudioEnv) {
                 handleConnectKey();
               } else {
                 setHasApiKey(false);
                 setManualApiKey("");
               }
            }}
            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full"
            title="Switch API Key"
        >
            <Key size={14} />
            <span>API Key</span>
        </button>
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
                {viewedImage.settings.lightingDirection && (
                  <>
                    <span className="text-gray-600">|</span>
                    <span className="capitalize">{viewedImage.settings.lightingDirection}</span>
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