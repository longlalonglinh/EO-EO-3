import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, X, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

interface ReloadConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirmReload: () => void;
  examCode?: string;
  candidateId?: string;
  isExamActive?: boolean;
}

export const ReloadConfirmationModal: React.FC<ReloadConfirmationModalProps> = ({
  isOpen,
  onCancel,
  onConfirmReload,
  examCode = '',
  candidateId = '',
  isExamActive = true
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="relative max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-purple-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          title="Đóng (Tiếp tục)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-amber-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#3C2A63] leading-snug">
              Xác Nhận Tải Lại Trang?
            </h3>
            <p className="text-xs text-[#7C68A5] mt-1 font-medium">
              Reload Page Confirmation
            </p>
          </div>
        </div>

        {/* Warning Content Box */}
        {isExamActive ? (
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Bài thi của bạn đang diễn ra {examCode ? `[${examCode}]` : ''}</span>
            </div>
            <p className="text-[12px] text-amber-900/90">
              Việc tải lại trang web hoặc tắt trình duyệt có thể làm gián đoạn luồng âm thanh Listening và bị ghi nhận vào nhật ký giám sát thi (Proctoring Log).
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dữ liệu câu trả lời của bạn đã được tự động lưu vào IndexedDB.</span>
            </div>
          </div>
        ) : (
          <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-4 text-xs text-[#503A7A] space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-[#3C2A63]">
              <RefreshCw className="w-4 h-4 text-[#6B51A5] shrink-0" />
              <span>Làm mới ứng dụng hệ thống</span>
            </div>
            <p className="text-[12px] text-[#503A7A]">
              Bạn có chắc chắn muốn tải lại trang web không? Bất kỳ tiến trình hoặc thao tác chưa lưu nào có thể được khởi động lại.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-5 py-3 bg-[#6B51A5] hover:bg-[#583F8F] text-white rounded-2xl text-xs font-black shadow-lg shadow-purple-950/15 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isExamActive ? 'Tiếp tục làm bài (Hủy tải lại)' : 'Hủy bỏ (Ở lại trang)'}</span>
          </button>

          <button
            type="button"
            onClick={onConfirmReload}
            className="px-4 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xác nhận tải lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
