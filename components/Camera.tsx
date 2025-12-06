
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera as CameraIcon, AlertCircle, SwitchCamera } from 'lucide-react';
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

  const startCamera = async (deviceId?: string) => {
    stopStream();
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API not supported in this browser/context.");
      return;
    }

    try {
      // OPTIMIZATION: Request high-spec stream with native resolution
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId 
          ? { 
              deviceId: { exact: deviceId }, 
              width: { ideal: 3840, min: 1920 }, // Prefer 4K, min 1080p
              height: { ideal: 2160, min: 1080 },
              frameRate: { ideal: 30, max: 60 },
              // @ts-ignore - 'resizeMode' is a newer constraint supported in Chrome
              resizeMode: 'none' 
            }
          : { 
              facingMode: 'environment', 
              width: { ideal: 3840, min: 1920 }, 
              height: { ideal: 2160, min: 1080 },
              frameRate: { ideal: 30, max: 60 },
              // @ts-ignore
              resizeMode: 'none'
            }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // OPTIMIZATION: Enable Continuous Autofocus if supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }] as any
          });
          console.log("Continuous autofocus enabled");
        } catch (e) {
          console.warn("Could not enable autofocus:", e);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // OPTIMIZATION: Set internal resolution to match stream exactly
        // This prevents the browser compositor from scaling up a low-res texture
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
             const v = videoRef.current;
             v.width = v.videoWidth;
             v.height = v.videoHeight;
             v.play();
             setStreamStarted(true);
          }
          
          // Identify current device
          const settings = track.getSettings();
          if (settings.deviceId) setCurrentDeviceId(settings.deviceId);
        };
      }
      getDevices();

    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        setError("Permission denied. Please allow camera access.");
      } else if (err.name === 'OverconstrainedError') {
         // Fallback for devices that don't support 1080p/4K
         console.warn("High-Res unavailable, retrying with standard HD...");
         setTimeout(() => startCameraFallback(deviceId), 500);
         return;
      } else {
        setError("Camera error: " + err.message);
      }
    }
  };

  // Fallback method for older cameras
  const startCameraFallback = async (deviceId?: string) => {
    try {
      // Even in fallback, try to get 1080p (Full HD) instead of VGA
      const constraints = {
        audio: false,
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } 
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
             videoRef.current.width = videoRef.current.videoWidth;
             videoRef.current.height = videoRef.current.videoHeight;
             videoRef.current.play();
             setStreamStarted(true);
          }
        };
      }
      setError(null); 
    } catch (e: any) {
       // Deep fallback if 1080p fails (e.g. very old webcam)
       console.warn("HD Fallback failed, trying basic VGA...");
       try {
          const basicConstraints = {
            audio: false,
            video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
          };
          const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                 videoRef.current.width = videoRef.current.videoWidth;
                 videoRef.current.height = videoRef.current.videoHeight;
                 videoRef.current.play();
                 setStreamStarted(true);
              }
            };
          }
          setError(null);
       } catch (finalErr: any) {
          setError("Camera failed: " + finalErr.message);
       }
    }
  };

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    startCamera(devices[nextIndex].deviceId);
  };

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, []);

  // Calculate Aspect Ratio Multiplier
  const getRatio = (ratio: AspectRatio): number => {
    switch (ratio) {
      case '1:1': return 1;
      case '3:4': return 3/4;
      case '4:3': return 4/3;
      case '16:9': return 16/9;
      case '9:16': return 9/16;
      default: return 1;
    }
  };

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (videoRef.current && canvasRef.current && streamStarted) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Use the actual stream dimensions
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        const videoRatio = videoW / videoH;
        const targetRatio = getRatio(aspectRatio);

        let cropW, cropH, cropX, cropY;

        if (videoRatio > targetRatio) {
          // Video is wider than target: Crop width
          cropH = videoH;
          cropW = videoH * targetRatio;
          cropX = (videoW - cropW) / 2;
          cropY = 0;
        } else {
          // Video is taller than target: Crop height
          cropW = videoW;
          cropH = videoW / targetRatio;
          cropX = 0;
          cropY = (videoH - cropH) / 2;
        }

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Note: We draw from the video directly, so capture is NOT mirrored (text remains readable)
          // The CSS mirror effect is only for the preview.
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const imageSrc = canvas.toDataURL('image/jpeg', 0.95); // High quality JPEG
          onCapture(imageSrc);
        }
      }
    }
  }));

  if (error && !error.includes("Retrying")) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-studio-800 text-red-400 p-6 text-center">
        <AlertCircle size={32} className="mb-2" />
        <p className="mb-4">{error}</p>
        <button onClick={() => startCamera()} className="px-4 py-2 bg-studio-700 rounded-full text-white">Retry</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 scale-x-[-1] ${streamStarted ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Aspect Ratio Mask */}
      {streamStarted && (
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div 
             className="border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] transition-all duration-300"
             style={{
               aspectRatio: aspectRatio.replace(':', '/'),
               width: getRatio(aspectRatio) >= 1 ? '90%' : 'auto',
               height: getRatio(aspectRatio) < 1 ? '90%' : 'auto',
               maxWidth: '90%',
               maxHeight: '90%'
             }}
           >
              {/* Thirds Grid for composition */}
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
      
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Switch Button */}
      {devices.length > 1 && (
        <button 
          onClick={handleSwitchCamera}
          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full z-20 backdrop-blur-md active:scale-95"
        >
          <SwitchCamera size={20} />
        </button>
      )}

      {/* Loading Overlay */}
      {!streamStarted && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
           <CameraIcon className="w-12 h-12 animate-pulse" />
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
           <div className="w-12 h-12 border-4 border-studio-accent border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-white font-medium animate-pulse">Developing...</p>
        </div>
      )}
    </div>
  );
});

export default Camera;
