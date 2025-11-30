
import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import SubmissionForm from './components/SubmissionForm';
import SubmissionList from './components/SubmissionList';
import ClassRankings from './components/ClassRankings';
import { StudentSubmission } from './types';
import { Toaster, toast } from 'react-hot-toast';
import { LayoutDashboard, PenTool, LogIn, Lock, LogOut, ArrowLeft, Loader2, Mail, List, Trophy } from 'lucide-react';
import { 
  subscribeToSubmissions, 
  addSubmissionToFirebase, 
  updateGradeInFirebase, 
  updateStudentDataInFirebase,
  deleteSubmissionFromFirebase,
  deleteAllSubmissionsFromFirebase,
  loginAdmin,
  logoutAdmin,
  subscribeToAuth
} from './services/firebase';
import { User } from 'firebase/auth'; // Type definition

const App: React.FC = () => {
  // State untuk Data
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Default false, only load when admin

  // State untuk Navigasi & Auth
  const [currentView, setCurrentView] = useState<'student' | 'admin'>('student');
  const [adminTab, setAdminTab] = useState<'list' | 'ranking'>('list'); // Tab Admin
  const [user, setUser] = useState<any>(null); // Firebase User object
  
  // Login Inputs - Email default terisi otomatis
  const [emailInput, setEmailInput] = useState('guru@sekolah.id');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 1. Monitor Status Login Auth
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Jika logout, bersihkan data sensitif
        setSubmissions([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Jika Admin Login, Baru Download Data (Secure)
  useEffect(() => {
    if (user && currentView === 'admin') {
      setIsLoading(true);
      const unsubscribeData = subscribeToSubmissions((data) => {
        setSubmissions(data);
        setIsLoading(false);
      }, (error) => {
        setIsLoading(false);
        if (error.code === 'permission-denied') {
          toast.error("Akses ditolak. Cek Rules Database Anda.");
        }
      });
      return () => unsubscribeData();
    }
  }, [user, currentView]);

  const handleSubmissionComplete = async (data: {
    studentName: string;
    kelas: string;
    noAbsen: string;
    videoUrl: string;
    videoId: string;
    videoTitle: string;
    aiFeedback: string;
  }) => {
    try {
      await addSubmissionToFirebase({
        studentName: data.studentName,
        kelas: data.kelas,
        noAbsen: data.noAbsen,
        videoUrl: data.videoUrl,
        videoId: data.videoId,
        videoTitle: data.videoTitle,
        status: 'valid',
        submittedAt: new Date(),
        aiFeedback: data.aiFeedback
      });
      
      toast.success('Tugas berhasil dikirim dan tersimpan di server!');
    } catch (error: any) {
      console.error(error);
      // Tampilkan pesan error yang lebih spesifik ke user
      const msg = error.message?.includes("permission-denied") 
        ? "Izin database ditolak. Hubungi admin." 
        : "Gagal menyimpan tugas. Coba lagi.";
      
      toast.error(msg);
      throw error;
    }
  };

  const handleUpdateGrade = async (id: string, score: number, teacherFeedback: string) => {
    try {
      await updateGradeInFirebase(id, score, teacherFeedback);
      toast.success('Nilai berhasil disimpan ke database');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan nilai');
    }
  };

  const handleEditData = async (id: string, studentName: string, kelas: string, noAbsen: string) => {
    try {
      await updateStudentDataInFirebase(id, studentName, kelas, noAbsen);
      toast.success('Data siswa berhasil diperbarui');
    } catch (error) {
      console.error(error);
      toast.error('Gagal memperbarui data siswa');
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    try {
      await deleteSubmissionFromFirebase(id);
      toast.success('Data tugas berhasil dihapus dari database');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus data');
    }
  };

  const handleDeleteAll = async () => {
    if (submissions.length === 0) {
      toast.error("Tidak ada data untuk dihapus.");
      return;
    }

    const confirm1 = window.confirm("PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data tugas? Tindakan ini tidak dapat dibatalkan.");
    if (!confirm1) return;

    const confirm2 = window.prompt("Ketik 'HAPUS' (huruf besar semua) untuk mengonfirmasi penghapusan massal.");
    if (confirm2 !== "HAPUS") {
      toast.error("Konfirmasi gagal. Penghapusan dibatalkan.");
      return;
    }

    try {
      await deleteAllSubmissionsFromFirebase();
      toast.success("Semua data berhasil dihapus bersih.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menghapus semua data.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await loginAdmin(emailInput, passwordInput);
      toast.success("Login berhasil");
      // Jangan reset email agar tetap terisi jika logout nanti
      setPasswordInput('');
    } catch (error: any) {
      console.error(error);
      let msg = "Login gagal.";
      if (error.code === 'auth/invalid-email') msg = "Format email salah.";
      if (error.code === 'auth/invalid-credential') msg = "Email atau password salah.";
      toast.error(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      setCurrentView('student');
      toast.success("Berhasil keluar");
    } catch (error) {
      toast.error("Gagal logout");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
      <Toaster position="top-center" />
      
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('student')}>
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white">
                <PenTool className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">VlogValidator</span>
            </div>
            
            <div className="flex items-center gap-4">
              {currentView === 'student' ? (
                <button
                  onClick={() => setCurrentView('admin')}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Portal Guru
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentView('student')}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Ke Portal Siswa
                  </button>
                  {user && (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors bg-red-50 px-3 py-1.5 rounded-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* VIEW: STUDENT PORTAL */}
        {currentView === 'student' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Hero />
            <SubmissionForm onSubmissionComplete={handleSubmissionComplete} />
            <div className="mt-8 text-center">
               <p className="text-sm text-gray-500">
                 Sudah mengumpulkan? Data Anda aman tersimpan di server.
               </p>
            </div>
          </div>
        )}

        {/* VIEW: ADMIN PORTAL */}
        {currentView === 'admin' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!user ? (
              // Login Form
              <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center mt-10">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Guru</h2>
                <p className="text-gray-500 mb-6">Silakan login menggunakan akun Firebase yang terdaftar.</p>
                
                <form onSubmit={handleLogin} className="space-y-4 text-left">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="guru@sekolah.id"
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md flex items-center justify-center gap-2 mt-6 disabled:bg-gray-400"
                  >
                    {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                    Masuk Dashboard
                  </button>
                </form>
              </div>
            ) : (
              // Admin Dashboard
              <div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                  <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-blue-600" />
                        Dashboard Guru
                      </h1>
                      <p className="text-gray-500 mt-1">
                        Selamat datang, <span className="font-semibold text-gray-700">{user.email}</span>
                      </p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-gray-900">Total Tugas</div>
                      <div className="text-3xl font-bold text-blue-600">
                          {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto"/> : submissions.length}
                      </div>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setAdminTab('list')}
                      className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                        adminTab === 'list' 
                          ? 'border-blue-600 text-blue-600 bg-blue-50' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Data Tugas
                    </button>
                    <button
                      onClick={() => setAdminTab('ranking')}
                      className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                        adminTab === 'ranking' 
                          ? 'border-blue-600 text-blue-600 bg-blue-50' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Trophy className="w-4 h-4" />
                      Peringkat & Nilai
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-500">Memuat data aman dari server...</p>
                  </div>
                ) : (
                  <>
                    {adminTab === 'list' ? (
                      <SubmissionList 
                        submissions={submissions} 
                        onUpdateGrade={handleUpdateGrade}
                        onDelete={handleDeleteSubmission}
                        onDeleteAll={handleDeleteAll}
                        onEditData={handleEditData}
                      />
                    ) : (
                      <ClassRankings submissions={submissions} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-gray-400 border-t pt-8">
          <p>© {new Date().getFullYear()} VlogValidator. Didukung oleh Gemini & Firebase.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
