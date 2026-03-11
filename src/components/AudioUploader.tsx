import React, { useRef, useState } from 'react';
import { Upload, FileAudio, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onUpload: (file: File) => void;
  isProcessing: boolean;
}

export const AudioUploader: React.FC<Props> = ({ onUpload, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-white/10 bg-white/5 hover:bg-white/10'
        } ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
        />

        {isProcessing ? (
          <>
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-medium text-white mb-2">Analyzing Audio...</h3>
              <p className="text-white/60">Gemini is transcribing and segmenting your audio.</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
              <Upload className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-medium text-white mb-2">Upload Practice Material</h3>
              <p className="text-white/60">Drag and drop an MP3, WAV, or M4A file here</p>
              <p className="text-white/40 text-sm mt-4">Max file size: 50MB</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
