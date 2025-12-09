import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera as CameraIcon, AlertCircle, ChevronDown } from 'lucide-react';
import { AspectRatio } from '../types';

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  isProcessing: boolean;
  aspectRatio: AspectRatio;
}

export interface CameraHandle {
  capture: () => void;
}

const Camera = forwardRef<CameraHandle, CameraProps>(({ onCapture, isProcessing, aspectRatio }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  
  // Device switching state
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  
  // Heuristic: Desktop defaults to 'user' (mirrored), Mobile defaults to 'environment' (not mirrored)
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(isMobile ? 'environment' : 'user');

  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamStarted(false);
  };

  const getDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all.filter(d => d.kind === 'videoinput');
      setDevices(videoInputs);
    } catch (e) {
      console.warn("Could not enumerate devices:", e);
    }
  };

  // Optimize interaction: Listen for new devices being plugged in/out
  useEffect(() => {
    const handleDeviceChange = () => {
      getDevices();
    };
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
    return () => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    }
  }, []);

  const startCamera = async (deviceId?: string, preferredMode?: 'user' | 'environment') => {
    stopStream();
    setError(null);
    
    let targetMode = preferredMode || facingMode;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API not supported in this browser.");
      return;
    }

    try {
      // 4K Ideal, but min 1080p. 
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId 
          ? { 
              deviceId: { exact: deviceId },
              width: { ideal: 3840 }, 
              height: { ideal: 2160 },
            }
          : { 
              facingMode: targetMode,
              width: { ideal: 3840 }, 
              height: { ideal: 2160 },
            }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Attempt Autofocus
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
        } catch (e) { console.warn("Autofocus not supported", e); }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
             videoRef.current.play().catch(e => console.error("Play error", e));
             setStreamStarted(true);
          }
          
          const settings = track.getSettings();
          if (settings.deviceId) setCurrentDeviceId(settings.deviceId);
          
          if (settings.facingMode) {
             setFacingMode(settings.facingMode as 'user' | 'environment');
          } else {
             // Fallback: If browser doesn't report mode (common on desktop webcams), assume targetMode
             setFacingMode(targetMode);
          }
        };
      }
      
      // Refresh device list to ensure labels are available after permission grant
      getDevices();

    } catch (err: any) {
      console.error("Camera Error:", err);
      if (err.name === 'NotAllowedError') {
        setError("Camera permission denied.");
      } else if (err.name === 'OverconstrainedError') {
         // Fallback to basic settings
         startCameraFallback(deviceId, targetMode);
      } else {
        setError("Camera error: " + err.message);
      }
    }
  };

  const startCameraFallback = async (deviceId?: string, mode: 'user' | 'environment' = 'user') => {
    try {
      const constraints = {
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: mode }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamStarted(true);
        setFacingMode(mode); 
        
        // Try to update current device ID if possible
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        if (settings.deviceId) setCurrentDeviceId(settings.deviceId);
      }
      setError(null);
    } catch (e: any) {
      setError("Could not start camera: " + e.message);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, []);

  const getRatio = (ratio: AspectRatio): number => {
    const map: Record<string, number> = { '1:1': 1, '3:4': 3/4, '4:3': 4/3, '16:9': 16/9, '9:16': 9/16 };
    return map[ratio] || 1;
  };

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (videoRef.current && canvasRef.current && streamStarted) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        const videoRatio = videoW / videoH;
        const targetRatio = getRatio(aspectRatio);

        let cropW, cropH, cropX, cropY;

        if (videoRatio > targetRatio) {
          cropH = videoH;
          cropW = videoH * targetRatio;
          cropX = (videoW - cropW) / 2;
          cropY = 0;
        } else {
          cropW = videoW;
          cropH = videoW / targetRatio;
          cropX = 0;
          cropY = (videoH - cropH) / 2;
        }

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // IMPORTANT: Capture raw image (not mirrored) so product text is readable
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const imageSrc = canvas.toDataURL('image/jpeg', 0.95);
          onCapture(imageSrc);
        }
      }
    }
  }));

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-studio-800 text-red-400 p-6 text-center">
        <AlertCircle size={32} className="mb-2" />
        <p className="mb-4 text-sm">{error}</p>
        <button onClick={() => startCamera()} className="px-4 py-2 bg-studio-700 rounded-full text-white text-sm hover:bg-studio-600">Retry Camera</button>
      </div>
    );
  }

  // Preview Mirror Logic:
  // Mirror if we are in 'user' mode (front camera / webcam default)
  const isMirrored = facingMode === 'user';

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-transform duration-300 ${isMirrored ? 'scale-x-[-1]' : 'scale-x-1'}`}
      />
      
      {/* Aspect Ratio Overlay */}
      {streamStarted && (
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div 
             className="border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] transition-all duration-300"
             style={{
               aspectRatio: aspectRatio.replace(':', '/'),
               width: getRatio(aspectRatio) >= 1 ? '90%' : 'auto',
               height: getRatio(aspectRatio) < 1 ? '90%' : 'auto',
               maxWidth: '94%',
               maxHeight: '94%'
             }}
           >
              {/* Thirds Grid */}
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-20">
                 <div className="border-r border-b border-white"></div>
                 <div className="border-r border-b border-white"></div>
                 <div className="border-b border-white"></div>
                 <div className="border-r border-b border-white"></div>
                 <div className="border-r border-b border-white"></div>
                 <div className="border-b border-white"></div>
                 <div className="border-r border-white"></div>
                 <div className="border-r border-white"></div>
                 <div></div>
              </div>
           </div>
         </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Device Selector (Top Right) */}
      {streamStarted && devices.length > 0 && (
         <div className="absolute top-4 right-4 z-20 w-48 max-w-[50vw]">
           <div className="relative group/select">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CameraIcon size={14} className="text-gray-300" />
             </div>
             <select 
               value={currentDeviceId}
               onChange={(e) => startCamera(e.target.value)}
               className="
                 appearance-none 
                 w-full 
                 bg-black/40 backdrop-blur-md 
                 text-white text-xs font-medium
                 pl-9 pr-8 py-2.5 
                 rounded-full 
                 border border-white/10 
                 hover:bg-black/60 hover:border-white/30
                 focus:outline-none focus:ring-2 focus:ring-studio-accent focus:border-transparent
                 cursor-pointer 
                 transition-all
                 truncate
                 shadow-lg
               "
             >
               {devices.map((device, index) => (
                 <option key={device.deviceId} value={device.deviceId} className="bg-gray-900 text-white">
                   {device.label || `Camera ${index + 1}`}
                 </option>
               ))}
             </select>
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-hover/select:text-white transition-colors">
               <ChevronDown size={14} /> 
             </div>
           </div>
         </div>
      )}

      {/* Loading */}
      {!streamStarted && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
           <CameraIcon className="w-8 h-8 animate-pulse" />
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-in fade-in duration-300">
           <div className="w-12 h-12 border-4 border-studio-accent border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-white font-medium animate-pulse tracking-wide">Developing Photo...</p>
        </div>
      )}
    </div>
  );
});

export default Camera;