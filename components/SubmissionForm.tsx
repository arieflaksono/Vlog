import React, { useState } from 'react';
import { extractVideoId, getVideoDetails } from '../services/youtubeService';
import { generateEncouragingFeedback } from '../services/geminiService';
import { ValidationStep, VideoValidationResult } from '../types';
import { Loader2, Search, Send, AlertCircle, CheckCircle2, MessageSquareQuote, RefreshCw } from 'lucide-react';

interface SubmissionFormProps {
  onSubmissionComplete: (data: {
    studentName: string;
    kelas: string;
    noAbsen: string;
    videoUrl: string;
    videoId: string;
    videoTitle: string;
    aiFeedback: string;
  }) => Promise<void>;
}

interface SuccessData {
  studentName: string;
  videoTitle: string;
  aiFeedback: string;
  timestamp: Date;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSubmissionComplete }) => {
  const [studentName, setStudentName] = useState('');
  const [kelas, setKelas] = useState('');
  const [noAbsen, setNoAbsen] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [validationStep, setValidationStep] = useState<ValidationStep>(ValidationStep.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State untuk menampilkan kartu sukses
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const classOptions = [
    "9-A", "9-B", "9-C", "9-D", "9-E", 
    "9-F", "9-G"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setValidationStep(ValidationStep.EXTRACTING);

    // Trim inputs
    const cleanUrl = videoUrl.trim();
    const cleanName = studentName.trim();
    const cleanKelas = kelas.trim();
    const cleanAbsen = noAbsen.trim();

    // 1. Extract ID
    const videoId = extractVideoId(cleanUrl);
    if (!videoId) {
      setValidationStep(ValidationStep.ERROR);
      setErrorMsg("URL YouTube tidak valid. Harap gunakan link lengkap (contoh: youtube.com/watch?v=...)");
      return;
    }

    // 2. Get Video Details (No API Key validation required)
    setValidationStep(ValidationStep.VALIDATING_API);
    const validation: VideoValidationResult = await getVideoDetails(videoId);

    // 3. Generate AI Feedback
    setValidationStep(ValidationStep.GENERATING_FEEDBACK);
    const feedback = await generateEncouragingFeedback(cleanName, validation.title || 'Vlog', cleanKelas);

    try {
      // 4. Send to Firebase
      await onSubmissionComplete({
        studentName: cleanName,
        kelas: cleanKelas,
        noAbsen: cleanAbsen,
        videoUrl: cleanUrl,
        videoId,
        videoTitle: validation.title || 'Video Tanpa Judul',
        aiFeedback: feedback,
      });

      // 5. Show Success View instead of resetting immediately
      setValidationStep(ValidationStep.COMPLETE);
      setSuccessData({
        studentName: cleanName,
        videoTitle: validation.title || 'Video Tanpa Judul',
        aiFeedback: feedback,
        timestamp: new Date()
      });

      // Clear form inputs locally (ready for next time)
      setStudentName('');
      setKelas('');
      setNoAbsen('');
      setVideoUrl('');
      
    } catch (error: any) {
      console.error("Submission error:", error);
      setValidationStep(ValidationStep.ERROR);
      // Tampilkan pesan error asli jika ada, untuk memudahkan debugging user
      setErrorMsg(error.message || "Gagal menyimpan ke server. Silakan coba lagi.");
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setValidationStep(ValidationStep.IDLE);
  };

  const isProcessing = validationStep !== ValidationStep.IDLE && validationStep !== ValidationStep.ERROR && validationStep !== ValidationStep.COMPLETE;

  // TAMPILAN SUKSES (TUGAS DITERIMA)
  if (successData) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-8 w-full max-w-lg mx-auto text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tugas Diterima!</h2>
        <p className="text-gray-500 mb-6">
          Terima kasih <span className="font-semibold text-gray-900">{successData.studentName}</span>, 
          video kamu sudah masuk ke sistem guru.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 text-left relative">
          <div className="absolute -top-3 left-4 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
            <MessageSquareQuote className="w-3 h-3" />
            KOMENTAR AI
          </div>
          <p className="text-gray-700 italic text-lg leading-relaxed">
            "{successData.aiFeedback}"
          </p>
        </div>

        <button
          onClick={handleReset}
          className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Kirim Tugas Lain
        </button>
      </div>
    );
  }

  // TAMPILAN FORMULIR (NORMAL)
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8 w-full max-w-lg mx-auto relative overflow-hidden">
      {/* Progress Bar Background */}
      {isProcessing && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
          <div className="h-full bg-blue-600 animate-pulse w-2/3"></div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nama Siswa</label>
          <input
            id="name"
            type="text"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
            placeholder="Contoh: Budi Santoso"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="kelas" className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
            <div className="relative">
              <select
                id="kelas"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none bg-white"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                disabled={isProcessing}
              >
                <option value="" disabled>Pilih Kelas</option>
                {classOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="noAbsen" className="block text-sm font-medium text-gray-700 mb-1">No Absen</label>
            <input
              id="noAbsen"
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="05"
              value={noAbsen}
              onChange={(e) => setNoAbsen(e.target.value)}
              disabled={isProcessing}
            />
          </div>
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">Link Video YouTube</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="url"
              type="url"
              required
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Link video status Publik, Tidak Publik, atau Pribadi semua diterima.
          </p>
        </div>

        {validationStep === ValidationStep.ERROR && errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || !studentName || !videoUrl || !kelas || !noAbsen}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium shadow-md flex items-center justify-center gap-2 transition-all
            ${isProcessing || !studentName || !videoUrl || !kelas || !noAbsen
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'
            }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {validationStep === ValidationStep.EXTRACTING && 'Mengecek URL...'}
              {validationStep === ValidationStep.VALIDATING_API && 'Memproses Link...'}
              {validationStep === ValidationStep.GENERATING_FEEDBACK && 'Menyelesaikan...'}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Kirim Tugas
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SubmissionForm;