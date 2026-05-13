import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { API_BASE } from '../api';

interface ImageUploadProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  fallbackColor?: string;
  label?: string;
}

const SIZE_CLASSES = {
  sm: 'h-24 w-24',
  md: 'h-36 w-36',
  lg: 'h-48 w-48',
};

export default function ImageUpload({
  imageUrl,
  onImageChange,
  shape = 'square',
  size = 'md',
  fallbackColor,
  label = 'Upload image',
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewOpen]);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (json.ok && json.url) {
        onImageChange(json.url);
      } else {
        setError(json.error || 'Upload failed');
      }
    } catch {
      setError('Server not reachable');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange('');
  };

  const sizeClass = SIZE_CLASSES[size];
  const roundClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div className="flex flex-col items-center gap-2">
      {previewOpen && imageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="relative w-full max-w-5xl">
            <button
              type="button"
              className="absolute -top-3 -right-3 rounded-full border border-dusk bg-abyss/90 p-2 text-moonlight shadow-lg hover:bg-shadow"
              aria-label="Close preview"
              onClick={() => setPreviewOpen(false)}
            >
              <X size={18} />
            </button>
            <img
              src={imageUrl}
              alt=""
              className="max-h-[85vh] w-full rounded-xl border border-dusk bg-abyss object-contain shadow-2xl"
              draggable={false}
            />
            <p className="mt-2 text-center text-xs text-mist">
              Press <span className="rounded bg-abyss px-1">Esc</span> or click outside to close.
            </p>
          </div>
        </div>
      )}

      <div
        className={`${sizeClass} ${roundClass} relative cursor-pointer border-2 border-dashed border-dusk overflow-hidden transition-all hover:border-arcane/50 group`}
        style={{ backgroundColor: !imageUrl && fallbackColor ? fallbackColor : '#1a1a2e' }}
        onClick={() => {
          if (imageUrl) setPreviewOpen(true);
          else fileRef.current?.click();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (imageUrl) setPreviewOpen(true);
            else fileRef.current?.click();
          }
        }}
        aria-label={label}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt=""
              className={`h-full w-full object-cover ${roundClass}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 rounded-full bg-void/80 p-1 text-blood opacity-0 transition-opacity group-hover:opacity-100 hover:bg-blood/20"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-mist/60 group-hover:text-mist transition-colors">
            {uploading ? (
              <Loader2 size={24} className="animate-spin text-arcane" />
            ) : (
              <>
                <ImagePlus size={24} />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {label}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-xs text-blood">{error}</p>}
    </div>
  );
}
