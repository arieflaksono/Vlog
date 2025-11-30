import React, { useState, useMemo } from 'react';
import { StudentSubmission } from '../types';
import { ExternalLink, User, Calendar, MessageSquareQuote, Search, ArrowUpDown, Filter, Download, Star, X, Save, PenTool, Trash2, Loader2, Pencil, Trash } from 'lucide-react';

interface SubmissionListProps {
  submissions: StudentSubmission[];
  onUpdateGrade?: (id: string, score: number, teacherFeedback: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onDeleteAll?: () => Promise<void> | void;
  onEditData?: (id: string, studentName: string, kelas: string, noAbsen: string) => Promise<void>;
}

type SortOption = 'newest' | 'oldest' | 'name_asc';

const SubmissionList: React.FC<SubmissionListProps> = ({ submissions, onUpdateGrade, onDelete, onDeleteAll, onEditData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  
  // State untuk Modal Penilaian
  const [gradingSubmission, setGradingSubmission] = useState<StudentSubmission | null>(null);
  const [inputScore, setInputScore] = useState<string>('');
  const [inputFeedback, setInputFeedback] = useState<string>('');

  // State untuk Modal Edit Data
  const [editingSubmission, setEditingSubmission] = useState<StudentSubmission | null>(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editAbsen, setEditAbsen] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // State untuk Loading Hapus
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Daftar Kelas Standard
  const classOptions = [
    "9-A", "9-B", "9-C", "9-D", "9-E", 
    "9-F", "9-G"
  ];

  // Extract unique classes for the filter dropdown
  const uniqueClasses = useMemo(() => {
    const classes = new Set(submissions.map(sub => sub.kelas.trim()).filter(c => c.length > 0));
    return Array.from(classes).sort();
  }, [submissions]);

  const filteredAndSortedSubmissions = useMemo(() => {
    // 1. Filter
    let result = submissions.filter((sub) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        sub.studentName.toLowerCase().includes(term) ||
        sub.kelas.toLowerCase().includes(term) ||
        sub.noAbsen.toLowerCase().includes(term) ||
        sub.videoTitle.toLowerCase().includes(term)
      );

      // Normalize class comparison
      const matchesClass = selectedClass === 'all' || sub.kelas.trim() === selectedClass;

      return matchesSearch && matchesClass;
    });

    // 2. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.submittedAt.getTime() - a.submittedAt.getTime();
        case 'oldest':
          return a.submittedAt.getTime() - b.submittedAt.getTime();
        case 'name_asc':
          return a.studentName.localeCompare(b.studentName);
        default:
          return 0;
      }
    });

    return result;
  }, [submissions, searchTerm, sortBy, selectedClass]);

  const handleDownloadCSV = () => {
    if (submissions.length === 0) return;

    // Header CSV
    const headers = ["Nama Siswa", "Kelas", "No Absen", "Judul Video", "Link YouTube", "Waktu Pengumpulan", "Feedback AI", "Nilai", "Catatan Guru"];
    
    // Isi Data
    const rows = submissions.map(sub => [
      `"${sub.studentName}"`, 
      `"${sub.kelas}"`,
      `"${sub.noAbsen}"`,
      `"${sub.videoTitle.replace(/"/g, '""')}"`, 
      `"${sub.videoUrl}"`,
      `"${sub.submittedAt.toLocaleString('id-ID')}"`,
      `"${sub.aiFeedback ? sub.aiFeedback.replace(/"/g, '""') : ''}"`,
      `"${sub.score ?? ''}"`,
      `"${sub.teacherFeedback ? sub.teacherFeedback.replace(/"/g, '""') : ''}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_tugas_vlog_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openGradingModal = (sub: StudentSubmission) => {
    setGradingSubmission(sub);
    setInputScore(sub.score?.toString() || '');
    setInputFeedback(sub.teacherFeedback || '');
  };

  const closeGradingModal = () => {
    setGradingSubmission(null);
    setInputScore('');
    setInputFeedback('');
  };

  const saveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (gradingSubmission && onUpdateGrade) {
      const scoreNum = parseFloat(inputScore);
      if (!isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 100) {
        onUpdateGrade(gradingSubmission.id, scoreNum, inputFeedback);
        closeGradingModal();
      } else {
        alert("Masukkan nilai yang valid (0-100)");
      }
    }
  };

  // EDIT DATA FUNCTIONS
  const openEditModal = (e: React.MouseEvent, sub: StudentSubmission) => {
    e.stopPropagation();
    setEditingSubmission(sub);
    setEditName(sub.studentName);
    setEditClass(sub.kelas);
    setEditAbsen(sub.noAbsen);
  };

  const closeEditModal = () => {
    setEditingSubmission(null);
    setEditName('');
    setEditClass('');
    setEditAbsen('');
  };

  const saveEditData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubmission && onEditData) {
      setIsEditing(true);
      await onEditData(editingSubmission.id, editName, editClass, editAbsen);
      setIsEditing(false);
      closeEditModal();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Mencegah event bubbling
    e.preventDefault();
    
    if (onDelete && window.confirm(`Apakah Anda yakin ingin menghapus tugas dari "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } catch (error) {
        console.error("Gagal menghapus:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (submissions.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-12 mb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Data Pengumpulan
            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-sm font-medium">
              {submissions.length}
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">Daftar siswa yang telah berhasil divalidasi.</p>
        </div>

        <div className="flex gap-2">
          {onDeleteAll && (
            <button 
              onClick={onDeleteAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm font-medium h-10"
              title="Hapus semua data dari database"
            >
              <Trash className="w-4 h-4" />
              Hapus Semua Data
            </button>
          )}

          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium h-10"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 sticky top-4 z-10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama, kelas, atau judul..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative min-w-[160px]">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white appearance-none cursor-pointer transition-all"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">Semua Kelas</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[140px]">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white appearance-none cursor-pointer transition-all"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="name_asc">Nama (A-Z)</option>
            </select>
          </div>
        </div>
      </div>
      
      {filteredAndSortedSubmissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Filter className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-900 font-medium">Tidak ada hasil ditemukan</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedClass('all'); }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            Hapus semua filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedSubmissions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center text-indigo-600 flex-shrink-0 border border-indigo-50">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">
                      {sub.studentName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">{sub.kelas}</span>
                      <span>•</span>
                      <span>No. Absen: <span className="font-medium text-gray-900">{sub.noAbsen}</span></span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end">
                   <div className="flex items-center text-xs text-gray-400 gap-1 mb-1">
                      <Calendar className="w-3 h-3" />
                      <span>{sub.submittedAt.toLocaleDateString('id-ID')}</span>
                   </div>
                   
                   {/* Badge Nilai jika sudah dinilai */}
                   {sub.score !== undefined ? (
                     <div className="mt-1 flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm font-bold border border-green-200">
                       <Star className="w-3 h-3 fill-current" />
                       {sub.score}
                     </div>
                   ) : (
                     <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded mt-1">Belum dinilai</span>
                   )}
                </div>
              </div>

              <div className="pl-[52px]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <div className="h-16 w-28 bg-gray-200 rounded overflow-hidden flex-shrink-0 relative group-hover:opacity-90 transition-opacity">
                     <img 
                        src={`https://img.youtube.com/vi/${sub.videoId}/mqdefault.jpg`} 
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${sub.videoId}/default.jpg`;
                        }}
                     />
                     <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
                           <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-red-600 border-b-[4px] border-b-transparent ml-0.5"></div>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate pr-2">{sub.videoTitle}</p>
                    <a 
                      href={sub.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1 font-medium"
                    >
                      Buka di YouTube <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {sub.aiFeedback && (
                  <div className="mt-2 text-sm text-gray-600 flex gap-2 items-start">
                    <MessageSquareQuote className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                    <p className="italic text-gray-600">"{sub.aiFeedback}"</p>
                  </div>
                )}
                
                {/* Tombol Aksi Guru */}
                {onUpdateGrade && (
                   <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                      {/* Tombol Edit Data Siswa */}
                      {onEditData && (
                        <button
                          type="button"
                          onClick={(e) => openEditModal(e, sub)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                          title="Edit Data Siswa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          disabled={deletingId === sub.id}
                          onClick={(e) => handleDelete(e, sub.id, sub.studentName)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
                          title="Hapus Tugas"
                        >
                          {deletingId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                      
                      <button 
                        onClick={() => openGradingModal(sub)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          sub.score !== undefined 
                            ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${sub.score !== undefined ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                        {sub.score !== undefined ? 'Ubah Nilai' : 'Beri Nilai & Tonton'}
                      </button>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Penilaian */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-600" />
                Penilaian Tugas
              </h3>
              <button 
                onClick={closeGradingModal}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Kolom Kiri: Video Player */}
              <div className="w-full md:w-2/3 bg-black flex flex-col relative min-h-[300px] md:min-h-0">
                <div className="relative flex-grow">
                  <iframe 
                    className="w-full h-full absolute inset-0"
                    src={`https://www.youtube.com/embed/${gradingSubmission.videoId}?autoplay=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
                
                {/* Fallback untuk error 153 (Embed disabled) yang LEBIH BESAR */}
                <div className="bg-gray-900 p-4 text-center border-t border-gray-800 shrink-0">
                  <p className="text-gray-400 text-xs mb-2">Jika video tidak bisa diputar (Layar Hitam/Error):</p>
                  <a 
                    href={gradingSubmission.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buka Langsung di YouTube App
                  </a>
                </div>
              </div>

              {/* Kolom Kanan: Form Nilai */}
              <div className="w-full md:w-1/3 p-6 overflow-y-auto bg-white flex flex-col">
                <div className="mb-6">
                  <h4 className="font-bold text-lg text-gray-900 mb-1">{gradingSubmission.studentName}</h4>
                  <div className="flex gap-2 text-sm text-gray-600 mb-4">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{gradingSubmission.kelas}</span>
                    <span>Absen {gradingSubmission.noAbsen}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Judul Video:</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{gradingSubmission.videoTitle}</p>
                </div>

                <form onSubmit={saveGrade} className="space-y-4 mt-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nilai (0-100)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      required
                      placeholder="Contoh: 85"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-center"
                      value={inputScore}
                      onChange={(e) => setInputScore(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                    <textarea 
                      rows={4}
                      placeholder="Bagus, namun pencahayaan kurang..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      value={inputFeedback}
                      onChange={(e) => setInputFeedback(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Nilai
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Data Siswa */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-gray-900">Edit Data Siswa</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveEditData} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Siswa</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                >
                  {classOptions.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No Absen</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editAbsen}
                  onChange={(e) => setEditAbsen(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionList;