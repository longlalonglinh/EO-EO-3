import React, { useState } from 'react';
import { Upload, FileUp, Cpu, Sparkles, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import { parsePdfWithGemini } from '../../services/gemini';
import { ExamData } from '../../types';

interface UploadModuleProps {
  onParsedData: (data: ExamData) => void;
}

export const UploadModule: React.FC<UploadModuleProps> = ({ onParsedData }) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawJsonOutput, setRawJsonOutput] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);

      // Convert to Base64
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:application/pdf;base64,
        const base64Clean = result.split(',')[1] || result;
        setBase64Data(base64Clean);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessPdf = async () => {
    if (!base64Data) {
      setErrorMsg('Vui lòng chọn 1 file PDF đề thi IELTS.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setRawJsonOutput(null);

    try {
      const jsonResultString = await parsePdfWithGemini(base64Data, apiKey.trim() || undefined);
      setRawJsonOutput(jsonResultString);

      // Clean JSON string codeblocks if present
      let cleanJson = jsonResultString.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsedExamData: ExamData = JSON.parse(cleanJson);
      onParsedData(parsedExamData);
    } catch (err: any) {
      console.error('Error parsing PDF with Gemini:', err);
      setErrorMsg(err.message || 'Lỗi bóc tách PDF bằng Gemini API. Vui lòng kiểm tra lại file hoặc API Key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur">
        <div>
          <h2 className="text-xl font-extrabold text-[#3C2A63] flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#6B51A5]" />
            <span>Upload & Bóc Tách Đề Thi Tự Động Bằng Gemini API</span>
          </h2>
          <p className="text-xs text-[#7C68A5] font-medium mt-1">
            Tải file PDF đề IELTS để AI tự động chuyển đổi sang cấu trúc chuẩn JSON Schema.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-purple-100 text-[#503A7A] border border-purple-200 px-3.5 py-1.5 rounded-full font-extrabold">
          <Sparkles className="w-4 h-4 text-[#6B51A5]" />
          <span>Powered by Google Gemini 1.5 Flash</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upload Form Panel */}
        <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 space-y-5">
          
          {/* API Key Input Optional */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#3C2A63] flex items-center justify-between">
              <span>Google Gemini API Key (Optional):</span>
              <span className="text-[10px] text-[#7C68A5] font-medium">(Tự động dùng default nếu bỏ trống)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl text-xs text-[#3C2A63] font-medium placeholder-[#7C68A5] focus:outline-none focus:ring-2 focus:ring-[#6B51A5]"
            />
          </div>

          {/* PDF Drag & Drop File Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#3C2A63]">Chọn File Đề Thi IELTS (.PDF):</label>
            <div className="border-2 border-dashed border-purple-200 hover:border-[#6B51A5] rounded-3xl p-6 text-center bg-[#F8F6FC] transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileUp className="w-10 h-10 text-[#6B51A5] mx-auto mb-2" />
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-emerald-800">{selectedFile.name}</p>
                  <p className="text-[10px] text-[#7C68A5] font-medium">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-[#3C2A63]">Kéo thả file PDF đề thi vào đây</p>
                  <p className="text-[10px] text-[#7C68A5] font-medium">Hỗ trợ các dạng đề thi IELTS PDF Tiếng Anh</p>
                </div>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="button"
            onClick={handleProcessPdf}
            disabled={loading || !base64Data}
            className="w-full py-3.5 bg-[#6B51A5] hover:bg-[#583F8F] text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-950/10 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Đang Bóc Tách PDF Bằng AI Gemini...' : 'Bắt Đầu Bóc Tách Đề Thi sang JSON'}</span>
          </button>
        </div>

        {/* Output Preview Status */}
        <div className="bg-white border border-purple-100/80 rounded-3xl p-6 shadow-xl shadow-purple-950/5 flex flex-col justify-between space-y-4">
          <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-[#6B51A5] uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              <span>Kết Quả JSON Bóc Tách Thô</span>
            </h4>
            {rawJsonOutput && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                Parsed Success
              </span>
            )}
          </div>

          <div className="flex-1 bg-[#F8F6FC] border border-purple-200/80 rounded-2xl p-4 overflow-y-auto max-h-[350px]">
            {rawJsonOutput ? (
              <pre className="text-[11px] text-[#3C2A63] font-mono leading-relaxed whitespace-pre-wrap">
                {rawJsonOutput}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#7C68A5] text-xs text-center space-y-2 py-12">
                <Cpu className="w-12 h-12 text-[#6B51A5]/50 animate-pulse" />
                <p className="font-medium">Kích hoạt bóc tách để xem dữ liệu JSON Schema chuẩn hóa từ AI Gemini 1.5 Flash.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
