import React from 'react';
import { ShieldAlert, BookOpen, UserCheck, FileText, Upload, Edit3, Settings, Maximize2, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeView: 'student' | 'admin';
  adminTab: 'dashboard' | 'grading' | 'upload' | 'preview' | 'gas_setup';
  setActiveView: (view: 'student' | 'admin') => void;
  setAdminTab: (tab: 'dashboard' | 'grading' | 'upload' | 'preview' | 'gas_setup') => void;
  studentMode?: 'TEST' | 'PRACTICE';
  sbd?: string;
  examCode?: string;
  gasUrl: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  adminTab,
  setActiveView,
  setAdminTab,
  studentMode,
  sbd,
  examCode,
  gasUrl
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Cannot enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-purple-100/80 text-[#3C2A63] sticky top-0 z-40 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Title */}
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#3C2A63]">
                EO EO Testing
              </h1>
              <p className="text-xs font-medium text-[#7C68A5]">
                {activeView === 'student' ? 'Giao Diện Thí Sinh Làm Bài' : 'Giao Diện Quản Lý Giáo Viên'}
              </p>
            </div>
          </div>

          {/* Center Info Badges for Student */}
          {activeView === 'student' && sbd && examCode && (
            <div className="hidden md:flex items-center space-x-3 bg-[#F5F2F9] px-4 py-1.5 rounded-2xl border border-purple-100">
              <span className="text-xs font-medium text-[#503A7A]">
                SBD: <strong className="text-[#3C2A63] font-bold">{sbd}</strong>
              </span>
              <span className="text-purple-200">|</span>
              <span className="text-xs font-medium text-[#503A7A]">
                Mã đề: <strong className="text-[#6B51A5] font-bold">{examCode}</strong>
              </span>
              <span className="text-purple-200">|</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                studentMode === 'TEST'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {studentMode === 'TEST' ? '🔒 EXAM MODE' : '📖 PRACTICE MODE'}
              </span>
            </div>
          )}

          {/* Admin Sub-Tabs */}
          {activeView === 'admin' && (
            <div className="hidden lg:flex items-center space-x-1 bg-[#E2DDEC] p-1.5 rounded-2xl">
              <button
                onClick={() => setAdminTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === 'dashboard' ? 'bg-[#6B51A5] text-white shadow-md' : 'text-[#3C2A63] hover:text-[#503A7A]'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Giám Sát & Logs
              </button>

              <button
                onClick={() => setAdminTab('grading')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === 'grading' ? 'bg-[#6B51A5] text-white shadow-md' : 'text-[#3C2A63] hover:text-[#503A7A]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Chấm Bài Writing
              </button>

              <button
                onClick={() => setAdminTab('upload')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === 'upload' ? 'bg-[#6B51A5] text-white shadow-md' : 'text-[#3C2A63] hover:text-[#503A7A]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Đề (AI)
              </button>

              <button
                onClick={() => setAdminTab('preview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === 'preview' ? 'bg-[#6B51A5] text-white shadow-md' : 'text-[#3C2A63] hover:text-[#503A7A]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Preview Đề Thi
              </button>

              <button
                onClick={() => setAdminTab('gas_setup')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  adminTab === 'gas_setup' ? 'bg-[#6B51A5] text-white shadow-md' : 'text-[#3C2A63] hover:text-[#503A7A]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Cấu Hình GAS
              </button>
            </div>
          )}

          {/* Controls Right: View Switcher (Admin only) & Fullscreen */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* View Mode Toggle Button: Only shown when in Admin mode so teachers can return to Student view */}
            {activeView === 'admin' && (
              <button
                onClick={() => setActiveView('student')}
                className="px-3.5 py-1.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm bg-purple-100 text-[#503A7A] border border-purple-300/80 hover:bg-purple-200"
                title="Quay lại giao diện thí sinh"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Về Giao Diện Thí Sinh</span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-[#E2DDEC] hover:bg-[#D9D3E4] text-[#3C2A63] transition-all cursor-pointer"
              title="Toàn màn hình"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
