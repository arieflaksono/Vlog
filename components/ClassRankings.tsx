import React, { useState, useMemo } from 'react';
import { StudentSubmission } from '../types';
import { Trophy, Medal, Award, Filter, User } from 'lucide-react';

interface ClassRankingsProps {
  submissions: StudentSubmission[];
}

const ClassRankings: React.FC<ClassRankingsProps> = ({ submissions }) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Daftar Kelas Standard (Sama seperti di form)
  const classOptions = [
    "9-A", "9-B", "9-C", "9-D", "9-E", 
    "9-F", "9-G"
  ];

  const rankedData = useMemo(() => {
    // 1. Ambil hanya yang sudah dinilai (score tidak undefined/null)
    let data = submissions.filter(sub => sub.score !== undefined && sub.score !== null);

    // 2. Filter berdasarkan kelas jika dipilih
    if (selectedClass !== 'all') {
      data = data.filter(sub => sub.kelas === selectedClass);
    }

    // 3. Urutkan berdasarkan Nilai (Tertinggi ke Terendah)
    // Jika nilai sama, urutkan berdasarkan waktu pengumpulan (siapa cepat dia dapat posisi atas)
    data.sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });

    return data;
  }, [submissions, selectedClass]);

  // Statistik Kelas
  const stats = useMemo(() => {
    if (rankedData.length === 0) return { avg: 0, max: 0, min: 0 };
    const scores = rankedData.map(s => s.score || 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    return {
      avg: (sum / scores.length).toFixed(1),
      max: Math.max(...scores),
      min: Math.min(...scores)
    };
  }, [rankedData]);

  // Fungsi untuk mendapatkan ikon ranking
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-100" />; // Juara 1
      case 1: return <Medal className="w-6 h-6 text-gray-400 fill-gray-100" />; // Juara 2
      case 2: return <Medal className="w-6 h-6 text-orange-400 fill-orange-100" />; // Juara 3
      default: return <span className="text-gray-500 font-bold w-6 text-center">{index + 1}</span>;
    }
  };

  // Fungsi styling baris ranking
  const getRankStyle = (index: number) => {
    if (index === 0) return "bg-yellow-50 border-yellow-200 ring-1 ring-yellow-200";
    if (index === 1) return "bg-gray-50 border-gray-200";
    if (index === 2) return "bg-orange-50 border-orange-200";
    return "bg-white border-gray-100";
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 mb-20 animate-in fade-in slide-in-from-bottom-4">
      {/* Header & Filter */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Peringkat & Nilai
            </h2>
            <p className="text-sm text-gray-500">Lihat siswa berprestasi berdasarkan kelas.</p>
          </div>
          
          <div className="relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium cursor-pointer"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">Semua Kelas (Global)</option>
              {classOptions.map(cls => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistik Ringkas */}
        {rankedData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-semibold">Rata-Rata</p>
              <p className="text-2xl font-bold text-blue-600">{stats.avg}</p>
            </div>
            <div className="text-center border-l border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold">Tertinggi</p>
              <p className="text-2xl font-bold text-green-600">{stats.max}</p>
            </div>
            <div className="text-center border-l border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold">Terendah</p>
              <p className="text-2xl font-bold text-red-600">{stats.min}</p>
            </div>
          </div>
        )}
      </div>

      {/* List Peringkat */}
      {rankedData.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-900 font-medium">Belum ada data nilai</p>
          <p className="text-sm text-gray-500">Nilai tugas siswa terlebih dahulu untuk melihat peringkat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rankedData.map((sub, index) => (
            <div 
              key={sub.id} 
              className={`flex items-center p-4 rounded-xl border shadow-sm transition-transform hover:scale-[1.01] ${getRankStyle(index)}`}
            >
              {/* Kolom Ranking */}
              <div className="flex-shrink-0 w-12 flex justify-center items-center">
                {getRankIcon(index)}
              </div>

              {/* Info Siswa */}
              <div className="flex-grow min-w-0 ml-2">
                <div className="flex items-center gap-2 mb-1">
                   <h3 className="font-bold text-gray-900 truncate">{sub.studentName}</h3>
                   {selectedClass === 'all' && (
                     <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 font-medium">
                       {sub.kelas}
                     </span>
                   )}
                </div>
                <div className="flex items-center text-xs text-gray-500 gap-1">
                  <User className="w-3 h-3" />
                  <span>Absen: {sub.noAbsen}</span>
                </div>
              </div>

              {/* Nilai */}
              <div className="flex-shrink-0 text-right pl-4">
                <span className="block text-2xl font-bold text-gray-900">{sub.score}</span>
                <span className="text-xs text-gray-500 font-medium">Poin</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassRankings;