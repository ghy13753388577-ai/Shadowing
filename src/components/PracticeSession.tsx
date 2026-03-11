import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Mic, RotateCcw, CheckCircle2, AlertCircle, Loader2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Segment, AssessmentResult } from '../types';
import { assessPronunciation } from '../services/gemini';

interface Props {
  segment: Segment;
  audioUrl: string;
  onComplete: (score: number, blob: Blob) => void;
}

export const PracticeSession: React.FC<Props> = ({ segment, audioUrl, onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    originalAudioRef.current = new Audio(audioUrl);
    return () => {
      originalAudioRef.current?.pause();
      originalAudioRef.current = null;
      userAudioRef.current?.pause();
      userAudioRef.current = null;
    };
  }, [audioUrl]);

  const playUserRecording = () => {
    if (!recordedBlob) return;
    
    if (userAudioRef.current) {
      userAudioRef.current.pause();
    }

    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    userAudioRef.current = audio;
    
    setIsPlayingUser(true);
    audio.play();
    
    audio.onended = () => {
      setIsPlayingUser(false);
      URL.revokeObjectURL(url);
    };
  };

  const playOriginal = () => {
    if (!originalAudioRef.current) return;
    
    const audio = originalAudioRef.current;
    
    // 停止之前的播放并移除可能的旧监听器
    audio.pause();
    setIsPlayingOriginal(true);
    
    audio.currentTime = segment.start;

    const handleTimeUpdate = () => {
      if (audio.currentTime >= segment.end) {
        audio.pause();
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        setIsPlayingOriginal(false);
      }
    };

    // 监听播放结束（以防 segment.end 超过了音频总长度）
    const handleEnded = () => {
      setIsPlayingOriginal(false);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    
    audio.play().catch(err => {
      console.error('Playback failed:', err);
      setIsPlayingOriginal(false);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        handleAssessment(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAssessment(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAssessment = async (blob: Blob) => {
    setIsAssessing(true);
    try {
      const result = await assessPronunciation(blob, segment.text);
      setAssessment(result);
      onComplete(result.score, blob);
    } catch (err) {
      console.error('Assessment failed:', err);
    } finally {
      setIsAssessing(false);
    }
  };

  const reset = () => {
    setAssessment(null);
    setRecordedBlob(null);
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2 block">Reference Text</span>
        <h2 className="text-2xl font-medium text-white leading-relaxed">
          {segment.text.split(' ').map((word, i) => {
            const isIssue = assessment?.issues.some(issue => 
              issue.toLowerCase().includes(word.toLowerCase().replace(/[.,!?;]/g, ''))
            );
            return (
              <span 
                key={i} 
                className={`${isIssue ? 'text-red-400 underline decoration-red-400/50 underline-offset-4' : 'text-white'}`}
              >
                {word}{' '}
              </span>
            );
          })}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          onClick={playOriginal}
          disabled={isPlayingOriginal}
          className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-4 px-6 rounded-2xl border border-white/10 transition-all disabled:opacity-50"
        >
          {isPlayingOriginal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          <span className="font-medium">Listen to Original</span>
        </button>

        <div className="flex gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isAssessing}
            className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border transition-all ${
              isRecording 
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' 
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="font-medium">{isRecording ? 'Stop Recording' : 'Start Shadowing'}</span>
          </button>
          
          {recordedBlob && !isRecording && (
            <button
              onClick={playUserRecording}
              disabled={isPlayingUser}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border transition-all ${
                isPlayingUser 
                  ? 'bg-emerald-500 text-black border-emerald-500' 
                  : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <Volume2 className={`w-5 h-5 ${isPlayingUser ? 'animate-pulse' : ''}`} />
              <span className="font-medium">Play My Recording</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isAssessing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">AI Assessing Pronunciation...</p>
          </motion.div>
        )}

        {assessment && !isAssessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-zinc-500 text-xs font-mono uppercase tracking-widest block mb-1">AI Score</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${assessment.score >= 80 ? 'text-emerald-400' : assessment.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {assessment.score}
                  </span>
                  <span className="text-zinc-500 font-medium">/ 100</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={playUserRecording}
                  disabled={isPlayingUser}
                  className={`p-3 rounded-full transition-all ${isPlayingUser ? 'bg-emerald-500 text-black' : 'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
                  title="Play my recording"
                >
                  <Volume2 className={`w-5 h-5 ${isPlayingUser ? 'animate-pulse' : ''}`} />
                </button>
                <button 
                  onClick={reset}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 transition-all"
                  title="Reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
                <p className="text-zinc-300 text-sm leading-relaxed">{assessment.feedback}</p>
              </div>
              {assessment.issues.length > 0 && (
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-zinc-300 text-sm font-medium">Focus on these words:</p>
                    <div className="flex flex-wrap gap-2">
                      {assessment.issues.map((issue, i) => (
                        <span key={i} className="px-2 py-1 bg-red-400/10 text-red-400 text-xs rounded-md border border-red-400/20">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
