import React, { useState, useCallback } from 'react';
import { AudioUploader } from './components/AudioUploader';
import { PracticeSession } from './components/PracticeSession';
import { transcribeAudio } from './services/gemini';
import { Segment, AppState } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Headphones, Trophy, BookOpen, Settings, Volume2, Play } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({
    audioUrl: null,
    audioBlob: null,
    segments: [],
    isProcessing: false,
    currentSegmentId: null,
    errorMessage: null,
    bestRecordings: {},
  });

  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  const playRecording = (segmentId: string) => {
    const blob = state.bestRecordings[segmentId];
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    setPlayingRecordingId(segmentId);
    audio.play();
    audio.onended = () => {
      setPlayingRecordingId(null);
      URL.revokeObjectURL(url);
    };
  };

  const handleUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setState(prev => ({ 
      ...prev, 
      audioUrl: url, 
      audioBlob: file, 
      isProcessing: true,
      errorMessage: null 
    }));

    try {
      const segments = await transcribeAudio(file);
      setState(prev => ({ ...prev, segments, isProcessing: false }));
    } catch (error: any) {
      console.error('Transcription failed:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        errorMessage: error.message || 'Failed to process audio. Please try again.' 
      }));
    }
  };

  const handleSegmentComplete = (score: number, blob: Blob) => {
    if (!state.currentSegmentId) return;
    setState(prev => {
      const existingScore = prev.segments.find(s => s.id === prev.currentSegmentId)?.score || 0;
      const newBestRecordings = { ...prev.bestRecordings };
      
      if (score >= existingScore) {
        newBestRecordings[prev.currentSegmentId!] = blob;
      }

      return {
        ...prev,
        bestRecordings: newBestRecordings,
        segments: prev.segments.map(s => 
          s.id === prev.currentSegmentId ? { ...s, score } : s
        )
      };
    });
  };

  const currentSegment = state.segments.find(s => s.id === state.currentSegmentId);
  const averageScore = state.segments.filter(s => s.score !== undefined).length > 0
    ? Math.round(state.segments.reduce((acc, s) => acc + (s.score || 0), 0) / state.segments.filter(s => s.score !== undefined).length)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Headphones className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SHADOW ECHO</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">AI Pronunciation Coach</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
              <a href="#" className="hover:text-white transition-colors">Library</a>
              <a href="#" className="hover:text-white transition-colors">Progress</a>
              <a href="#" className="hover:text-white transition-colors">Community</a>
            </div>
            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!state.audioUrl ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-20"
            >
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
                  Perfect Your <span className="text-emerald-500">Accent.</span>
                </h2>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                  Upload any English audio. Our AI will break it down into sentences, 
                  guide your shadowing practice, and provide instant feedback.
                </p>
                {state.errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm max-w-md mx-auto"
                  >
                    {state.errorMessage}
                  </motion.div>
                )}
              </div>
              <AudioUploader onUpload={handleUpload} isProcessing={state.isProcessing} />
            </motion.div>
          ) : (
            <motion.div
              key="practice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              {/* Left Sidebar: Stats & Info */}
              <div className="lg:col-span-3 space-y-8">
                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Session Stats</span>
                    </div>
                    {Object.keys(state.bestRecordings).length > 0 && (
                      <button 
                        onClick={() => {
                          const lastId = state.segments.filter(s => s.score !== undefined).pop()?.id;
                          if (lastId) playRecording(lastId);
                        }}
                        className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-black transition-all"
                        title="Play last recording"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-6">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Average Score</span>
                      <div className="text-4xl font-bold text-white">{averageScore}%</div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Completed</span>
                      <div className="text-xl font-medium text-white">
                        {state.segments.filter(s => s.score !== undefined).length} / {state.segments.length}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setState({ audioUrl: null, audioBlob: null, segments: [], isProcessing: false, currentSegmentId: null })}
                  className="w-full flex items-center justify-center gap-2 py-4 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Upload New Material
                </button>
              </div>

              {/* Main Content: Practice Area */}
              <div className="lg:col-span-9 space-y-12">
                {state.currentSegmentId ? (
                  <div className="space-y-6">
                    <button 
                      onClick={() => setState(prev => ({ ...prev, currentSegmentId: null }))}
                      className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors text-sm font-medium"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to List
                    </button>
                    {currentSegment && (
                      <PracticeSession 
                        segment={currentSegment} 
                        audioUrl={state.audioUrl} 
                        onComplete={handleSegmentComplete}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-xl font-bold">Practice Segments</h3>
                      </div>
                      <span className="text-zinc-500 text-xs font-mono">{state.segments.length} Sentences Found</span>
                    </div>

                    <div className="grid gap-4">
                      {state.isProcessing ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="h-24 bg-zinc-900/50 rounded-2xl animate-pulse border border-white/5" />
                        ))
                      ) : (
                        state.segments.map((segment, index) => (
                          <motion.button
                            key={segment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setState(prev => ({ ...prev, currentSegmentId: segment.id }))}
                            className="group flex items-center justify-between p-6 bg-zinc-900/40 hover:bg-zinc-900 border border-white/5 hover:border-emerald-500/30 rounded-2xl transition-all text-left"
                          >
                            <div className="flex items-center gap-6">
                              <span className="text-zinc-600 font-mono text-sm group-hover:text-emerald-500 transition-colors">
                                {(index + 1).toString().padStart(2, '0')}
                              </span>
                              <p className="text-zinc-300 group-hover:text-white transition-colors line-clamp-1 max-w-xl">
                                {segment.text}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              {state.bestRecordings[segment.id] && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playRecording(segment.id);
                                  }}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    playingRecordingId === segment.id 
                                      ? 'bg-emerald-500 text-black' 
                                      : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black'
                                  }`}
                                >
                                  <Volume2 className={`w-4 h-4 ${playingRecordingId === segment.id ? 'animate-pulse' : ''}`} />
                                </button>
                              )}
                              {segment.score !== undefined && (
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  segment.score >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 
                                  segment.score >= 60 ? 'bg-yellow-500/10 text-yellow-500' : 
                                  'bg-red-500/10 text-red-500'
                                }`}>
                                  {segment.score}%
                                </div>
                              )}
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all">
                                <ChevronLeft className="w-4 h-4 rotate-180" />
                              </div>
                            </div>
                          </motion.button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-zinc-500 text-xs">© 2026 Shadow Echo AI. All rights reserved.</p>
          <div className="flex items-center gap-8 text-zinc-500 text-xs">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
