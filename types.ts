

export type BackgroundType = 'solid' | 'gradient' | 'texture' | 'image';

export interface BackgroundOption {
  id: string;
  name: string;
  type: BackgroundType;
  value: string; // Hex, CSS gradient, or prompt description for textures
  previewClass: string; // CSS class for the circle preview
  imageSrc?: string;
}

export interface LightingOption {
  id: string;
  name: string;
  value: string; // Prompt description
  icon: string;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';

export type LightingDirection = 'left' | 'right' | 'top' | 'top-left' | 'top-right' | 'front' | 'back' | 'bottom';

export interface CameraSettings {
  aspectRatio: AspectRatio;
  lightingDirection: LightingDirection;
}

export interface GeneratedImage {
  id: string;
  originalUrl: string;
  generatedUrl: string;
  timestamp: number;
  settings: {
    backgroundName: string;
    type: BackgroundType;
    value: string; // Store specific hex/prompt value
    previewClass: string;
    lightingName?: string;
    lightingDirection?: string;
  };
}

export enum AppState {
  IDLE = 'IDLE',
  CAPTURING = 'CAPTURING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export const PRESET_LIGHTING: LightingOption[] = [
  { id: 'studio-soft', name: 'Softbox', value: 'soft, diffused professional studio lighting, even illumination, soft shadows', icon: '☁️' },
  { id: 'natural-sun', name: 'Sunlight', value: 'natural bright sunlight, warm tones, sharp realistic cast shadows', icon: '☀️' },
  { id: 'dramatic', name: 'Dramatic', value: 'high contrast dramatic lighting, rim lighting (backlight), dark moody shadows', icon: '🌑' },
  { id: 'neon', name: 'Neon', value: 'cyberpunk neon lighting, blue and pink rim lights, glowing atmosphere', icon: '🟣' },
  { id: 'hard', name: 'Hard', value: 'direct hard flash photography, sharp defined shadows, pop-art style', icon: '⚡' },
];

export const PRESET_BACKGROUNDS: BackgroundOption[] = [
  // Keeping textures/gradients as presets, but solids will be handled by the joystick
  { id: 'gradient-sunset', name: 'Sunset', type: 'gradient', value: 'vibrant sunset orange to purple gradient studio background', previewClass: 'bg-gradient-to-tr from-orange-400 to-purple-500' },
  { id: 'gradient-blue', name: 'Tech Blue', type: 'gradient', value: 'futuristic cyan to deep blue neon gradient background', previewClass: 'bg-gradient-to-br from-cyan-400 to-blue-800' },
  { id: 'tex-wood', name: 'Wood', type: 'texture', value: 'natural warm oak wooden table surface with blurred background', previewClass: 'bg-[#8B4513]' },
  { id: 'tex-marble', name: 'Marble', type: 'texture', value: 'luxury white carrara marble surface background', previewClass: 'bg-[#F0F0F0]' },
  { id: 'tex-concrete', name: 'Concrete', type: 'texture', value: 'industrial minimal grey concrete surface', previewClass: 'bg-gray-400' },
];
