import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';

interface FaviconConfig {
  size: number;
  name: string;
  label: string;
}

const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#9333ea"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#bg)"/>
  <g fill="white" opacity="0.95">
    <rect x="32" y="22" width="22" height="56" rx="2"/>
    <rect x="22" y="46" width="14" height="32" rx="2"/>
    <rect x="62" y="36" width="14" height="42" rx="2"/>
    <rect x="37" y="28" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="28" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="37" y="36" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="36" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="37" y="44" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="44" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="37" y="52" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="52" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="26" y="52" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="26" y="60" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="66" y="42" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="66" y="50" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="66" y="58" width="6" height="5" rx="1" fill="#9333ea"/>
  </g>
</svg>`;

const sizes: FaviconConfig[] = [
  { size: 16, name: 'favicon-16x16.png', label: '16x16 (Browser Tab)' },
  { size: 32, name: 'favicon-32x32.png', label: '32x32 (Taskbar)' },
  { size: 48, name: 'favicon-48x48.png', label: '48x48 (Windows)' },
  { size: 64, name: 'favicon-64x64.png', label: '64x64 (Windows)' },
  { size: 128, name: 'favicon-128x128.png', label: '128x128 (Chrome Store)' },
  { size: 192, name: 'favicon-192x192.png', label: '192x192 (Android)' },
  { size: 512, name: 'favicon-512x512.png', label: '512x512 (PWA)' },
  { size: 180, name: 'apple-touch-icon.png', label: '180x180 (iOS)' },
  { size: 32, name: 'favicon.ico', label: '32x32 (favicon.ico)' }
];

export function FaviconGenerator() {
  const [canvases, setCanvases] = useState<Map<string, HTMLCanvasElement>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const svgToCanvas = async (size: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Failed to get canvas context');

    const img = new Image();
    const blob = new Blob([svgSource], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  useEffect(() => {
    const generatePreviews = async () => {
      const newCanvases = new Map<string, HTMLCanvasElement>();
      
      for (const config of sizes) {
        const canvas = await svgToCanvas(config.size);
        newCanvases.set(config.name, canvas);
      }
      
      setCanvases(newCanvases);
    };

    generatePreviews();
  }, []);

  const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const downloadAllFavicons = async () => {
    setIsGenerating(true);
    const zip = new JSZip();
    
    try {
      for (const config of sizes) {
        const canvas = await svgToCanvas(config.size);
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!));
        });
        zip.file(config.name, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prospaces-favicons.zip';
      a.click();
      URL.revokeObjectURL(url);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Error generating favicons:', error);
      alert('Error generating favicons. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-purple-600 mb-2">🏢 ProSpaces CRM Favicon Generator</h1>
        <p className="text-gray-600 mb-8">Download all favicon sizes for your deployment</p>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded">
          <h3 className="text-blue-600 mt-0 mb-2">📋 Instructions</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Click "Download All Favicons" below</li>
            <li>Extract the ZIP file to get all favicon images</li>
            <li>Upload all PNG files to your <code className="bg-blue-100 px-2 py-1 rounded">/public</code> folder in GitHub</li>
            <li>Deploy to Vercel and your favicon will appear!</li>
          </ol>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {sizes.map((config) => {
            const canvas = canvases.get(config.name);
            const displaySize = Math.min(config.size, 128);
            
            return (
              <div key={config.name} className="text-center p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="text-gray-600 mb-2">{config.label}</div>
                {canvas && (
                  <div className="flex justify-center mb-2">
                    <canvas
                      ref={(el) => {
                        if (el && canvas) {
                          el.width = displaySize;
                          el.height = displaySize;
                          const ctx = el.getContext('2d');
                          ctx?.drawImage(canvas, 0, 0, displaySize, displaySize);
                        }
                      }}
                      className="border border-gray-300 rounded"
                      style={{ width: displaySize, height: displaySize }}
                    />
                  </div>
                )}
                <div className="text-gray-500 text-sm mb-2">{config.name}</div>
                <button
                  onClick={() => canvas && downloadCanvas(canvas, config.name)}
                  disabled={!canvas}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Download
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={downloadAllFavicons}
          disabled={isGenerating || canvases.size === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? '📦 Generating...' : '📦 Download All Favicons (ZIP)'}
        </button>

        {showSuccess && (
          <div className="mt-6 bg-green-50 border-l-4 border-green-600 p-4 rounded">
            <h3 className="text-green-600 mt-0 mb-2">✅ Success!</h3>
            <p>Your favicons are downloading. Upload them to <code className="bg-green-100 px-2 py-1 rounded">/public</code> folder and redeploy.</p>
          </div>
        )}
      </div>
    </div>
  );
}