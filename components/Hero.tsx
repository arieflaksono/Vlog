import React from 'react';
import { Youtube } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <div className="text-center mb-10">
      <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full mb-4">
        <Youtube className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Portal Tugas Vlog</h1>
      <p className="text-gray-600 max-w-lg mx-auto mb-6">
        Kirimkan link vlog YouTube Anda di bawah ini. Pastikan data diri diisi dengan benar.
      </p>
    </div>
  );
};

export default Hero;