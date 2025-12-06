import { GoogleGenAI } from "@google/genai";
import { BackgroundOption, LightingOption, CameraSettings } from "../types";

export const generateStudioShot = async (
  imageBase64: string,
  background: BackgroundOption,
  lighting: LightingOption,
  settings: CameraSettings,
  apiKey?: string
): Promise<string> => {
  // PRIORITY: Use manually provided key first (for standalone users), 
  // fallback to process.env.API_KEY (for AI Studio embedded users).
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  
  // Clean base64 string
  const productBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
  
  let bgDescription = background.value;
  
  // Refine prompt based on background type
  if (background.type === 'solid') {
    bgDescription = `a solid, flat, matte background of this exact color: ${background.value}`;
  }

  // Map direction to descriptive text
  const directionMap: Record<string, string> = {
    'left': 'coming from the left side',
    'right': 'coming from the right side',
    'top': 'overhead lighting coming from the top',
    'top-left': 'coming from the top-left',
    'top-right': 'coming from the top-right',
    'front': 'direct frontal lighting',
    'bottom': 'coming from below (uplighting)',
    'back': 'backlighting (rim light)'
  };
  const lightDirText = directionMap[settings.lightingDirection] || 'professional studio lighting';

  // Core system instructions for PRO model
  // ENHANCED PROMPT: Focused on strict subject preservation and 4K quality
  let prompt = `
    You are a professional commercial product photographer and high-end retoucher.
    
    OBJECTIVE:
    Composite the foreground object (product) from the input image onto a new background description: "${bgDescription}".

    STRICT RULES FOR SUBJECT PRESERVATION (DO NOT IGNORE):
    1. THE PRODUCT IS SACRED: Do NOT redraw, stylize, or alter the internal details of the product.
    2. PRESERVE TEXT & LOGOS: Any text, logos, or labels on the product must remain legible and unchanged.
    3. PRESERVE TEXTURE: Keep the original surface texture and material finish of the product.
    4. NO HALLUCINATIONS: Do not add parts to the product that are not there. The input image is the source of truth.
    
    PHOTOGRAPHY SETTINGS:
    - OUTPUT QUALITY: 4K Ultra High Definition (3840x2160).
    - LIGHTING: Apply "${lighting.value}".
    - LIGHT DIRECTION: Light source ${lightDirText}.
    - SHADOWS: Cast realistic, physically accurate shadows from the product onto the new background.
  `;
  
  const parts: any[] = [
      { inlineData: { mimeType: 'image/jpeg', data: productBase64 } }
  ];

  if (background.type === 'image' && background.imageSrc) {
    const bgBase64 = background.imageSrc.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: bgBase64 } });
    
    prompt = `
      You are an expert high-end commercial retoucher.
      
      TASK:
      Composite the product from Image 1 onto the background scene in Image 2.

      RULES:
      1. PRESERVE IDENTITY: The product from Image 1 must look exactly the same in the final output. Do not alter its shape, color, or details.
      2. PERSPECTIVE: Place the product naturally within the scene of Image 2.
      3. LIGHTING MATCH: Apply lighting style "${lighting.value}" with direction ${lightDirText} to match the background environment.
      4. QUALITY: 4K Ultra High Definition.
    `;
  }

  parts.push({ text: prompt });

  // Attempt generation with Pro model first
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: parts },
      config: {
        imageConfig: {
          imageSize: '4K',
          aspectRatio: settings.aspectRatio
        }
      }
    });

    const img = extractImage(response);
    if (img) return img;
    
    throw new Error("Pro model returned no image.");

  } catch (error: any) {
    console.warn("Pro Model failed, falling back to Flash:", error);
    
    // Fallback to Flash if Pro fails (e.g. Permission Denied 403)
    try {
      // Simplified prompt for Flash model
      let flashPrompt = `Product photography. Keep the product exactly as it looks in the original image. Do not change the product. Only change the background to: ${bgDescription}. Lighting: ${lighting.value}. High quality 4K.`;
      
      const flashParts: any[] = [
          { inlineData: { mimeType: 'image/jpeg', data: productBase64 } }
      ];

      if (background.type === 'image' && background.imageSrc) {
          const bgBase64 = background.imageSrc.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
          flashParts.push({ inlineData: { mimeType: 'image/jpeg', data: bgBase64 } });
          flashPrompt = `Composite product from image 1 into image 2. Keep product exact. High quality.`;
      }
      
      flashParts.push({ text: flashPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: flashParts },
        // Flash does not support imageConfig with imageSize
      });
      
      const img = extractImage(response);
      if (!img) {
         const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
         if (text) throw new Error("AI Refusal: " + text.substring(0, 100));
         throw new Error("No image generated by fallback model.");
      }
      return img;
    } catch (fallbackError: any) {
       console.error("Fallback failed:", fallbackError);
       // Throw the fallback error if it exists, otherwise the original error
       throw new Error(fallbackError.message || error.message || "Failed to generate image.");
    }
  }
};

function extractImage(response: any): string | null {
  try {
    const contentParts = response.candidates?.[0]?.content?.parts;
    if (contentParts) {
      for (const part of contentParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (e) {
    console.error("Error extracting image:", e);
  }
  return null;
}