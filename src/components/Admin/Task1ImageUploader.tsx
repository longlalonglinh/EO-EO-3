import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  Link, 
  CheckCircle2, 
  AlertCircle,
  FileImage,
  ZoomIn
} from 'lucide-react';

interface Task1ImageUploaderProps {
  value?: string;
  onChange: (dataUrlOrUrl: string) => void;
  onClear?: () => void;
}

/**
 * Client-side image optimizer:
 * Scales down giant images to maximum dimension of 1600px and returns a clean Base64 Data URL.
 */
const optimizeAndConvertImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If SVG, read as text/dataURL directly
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1600;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Crisp rendering for chart lines, graphs, text
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = 0.88;
        resolve(canvas.toDataURL(mime, quality));
      };
      img.onerror = () => {
        // Fallback to raw base64 if canvas load fails
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const Task1ImageUploader: React.FC<Task1ImageUploaderProps> = ({
  value,
  onChange,
  onClear
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP, SVG).');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Calculate human-readable size
      const sizeInKb = Math.round(file.size / 1024);
      setFileSizeStr(sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`);
      setFileName(file.name);

      const optimizedBase64 = await optimizeAndConvertImage(file);
      onChange(optimizedBase64);
    } catch (err) {
      console.error('Lỗi khi đọc ảnh:', err);
      setErrorMsg('Không thể xử lý tệp ảnh này. Vui lòng thử lại với ảnh khác.');
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Clipboard paste support (e.g. screenshot pasted directly)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        handleProcessFile(file);
      }
    }
  };

  const handleClearImage = () => {
    setFileName(null);
    setFileSizeStr(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  const handleApplyUrl = () => {
    if (!urlDraft.trim()) return;
    onChange(urlDraft.trim());
    setFileName('Online URL Image');
    setFileSizeStr(null);
    setShowUrlInput(false);
    setUrlDraft('');
  };

  const hasImage = Boolean(value && value.trim().length > 0);
  const isDataUrl = Boolean(value && value.startsWith('data:image/'));

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      {/* Hidden file input for native device browsing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml, image/gif"
        onChange={handleFileChange}
        className="hidden"
        id="task1-image-file-input"
      />

      {/* Error message if any */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-800 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Case 1: Image is already selected / loaded */}
      {hasImage ? (
        <div className="bg-[#F8F6FC] border border-purple-200/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-[#3C2A63]">
                  {fileName || (isDataUrl ? 'Ảnh biểu đồ đã tải lên từ thiết bị' : 'Ảnh biểu đồ IELTS Task 1')}
                </p>
                <p className="text-[11px] text-[#7C68A5] font-medium">
                  {isDataUrl ? `Tải trực tiếp từ máy ${fileSizeStr ? `(${fileSizeStr})` : ''}` : 'Đường dẫn ảnh trực tuyến'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-white hover:bg-purple-50 text-[#6B51A5] border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Thay ảnh khác</span>
              </button>

              <button
                type="button"
                onClick={handleClearImage}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá ảnh</span>
              </button>
            </div>
          </div>

          {/* Visual Image Preview */}
          <div className="relative group rounded-xl overflow-hidden border border-purple-100 bg-white max-h-72 flex items-center justify-center p-2">
            <img
              src={value}
              alt="Task 1 Diagram Preview"
              className="max-h-64 w-auto object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="absolute bottom-3 right-3 bg-[#3C2A63]/80 hover:bg-[#3C2A63] text-white px-2.5 py-1.5 rounded-xl text-xs font-bold backdrop-blur flex items-center gap-1 opacity-90 group-hover:opacity-100 transition shadow cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Xem kích thước gốc</span>
            </button>
          </div>
        </div>
      ) : (
        /* Case 2: No image yet - Show Drag & Drop Direct Device Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-6 md:p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-[#6B51A5] bg-purple-50/80 scale-[1.01]'
              : 'border-purple-200/90 hover:border-[#6B51A5] bg-[#F8F6FC]/60 hover:bg-purple-50/40'
          }`}
        >
          <div className="p-4 bg-purple-100/70 text-[#6B51A5] rounded-2xl shadow-xs group-hover:scale-105 transition">
            {isProcessing ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-sm font-black text-[#3C2A63]">
              {isProcessing ? 'Đang tối ưu & tải ảnh lên...' : 'Tải ảnh biểu đồ trực tiếp từ thiết bị'}
            </p>
            <p className="text-xs text-[#7C68A5] font-medium mt-0.5">
              Kéo &amp; thả ảnh vào đây, hoặc <span className="text-[#6B51A5] font-bold underline">nhấn để chọn tệp</span> từ máy tính / điện thoại
            </p>
            <p className="text-[11px] text-[#A093BA] mt-1 font-medium">
              Hỗ trợ PNG, JPG, JPEG, WEBP, SVG (tự động tối ưu độ nét biểu đồ)
            </p>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="mt-1 px-4 py-2 bg-[#6B51A5] hover:bg-[#503A7A] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <FileImage className="w-4 h-4" />
            <span>Chọn ảnh từ thiết bị</span>
          </button>
        </div>
      )}

      {/* Alternative Option: Enter Image URL */}
      <div className="pt-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs text-[#7C68A5] hover:text-[#503A7A] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
            <span>{showUrlInput ? 'Ẩn nhập liên kết URL' : 'Hoặc nhập đường dẫn liên kết URL ảnh trực tuyến'}</span>
          </button>
          
          {hasImage && isDataUrl && (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
              ✓ Lưu trực tiếp trong đề thi
            </span>
          )}
        </div>

        {showUrlInput && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-purple-100 shadow-xs animate-in slide-in-from-top-2 duration-150">
            <input
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://images.unsplash.com/... hoặc link ảnh online"
              className="flex-1 px-3 py-2 bg-[#F8F6FC] rounded-xl border border-purple-100 text-xs font-mono text-[#3C2A63] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3.5 py-2 bg-[#6B51A5] hover:bg-[#503A7A] text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        )}
      </div>

      {/* Full Size Modal Preview */}
      {isPreviewOpen && hasImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-4xl max-h-[90vh] overflow-hidden p-4 shadow-2xl flex flex-col space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <span className="text-xs font-black text-[#3C2A63]">Xem ảnh Task 1 kích thước lớn</span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-xs bg-purple-50 hover:bg-purple-100 text-[#503A7A] font-bold px-2.5 py-1 rounded-xl cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>
            <div className="overflow-auto flex items-center justify-center max-h-[75vh]">
              <img
                src={value}
                alt="Full Diagram Preview"
                className="max-w-full h-auto object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
