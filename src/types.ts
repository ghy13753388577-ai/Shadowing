export interface Segment {
  id: string;
  text: string;
  start: number;
  end: number;
  score?: number;
  userAudio?: string; // base64 or blob URL
}

export interface AssessmentResult {
  score: number;
  feedback: string;
  issues: string[];
}

export interface AppState {
  audioUrl: string | null;
  audioBlob: Blob | null;
  segments: Segment[];
  isProcessing: boolean;
  currentSegmentId: string | null;
  errorMessage: string | null;
  bestRecordings: Record<string, Blob>;
}
