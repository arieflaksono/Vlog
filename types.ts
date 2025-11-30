export interface StudentSubmission {
  id: string;
  studentName: string;
  kelas: string;
  noAbsen: string;
  videoUrl: string;
  videoId: string;
  videoTitle: string;
  submittedAt: Date;
  status: 'valid';
  aiFeedback?: string;
  score?: number; // Nilai dari guru (0-100)
  teacherFeedback?: string; // Catatan tambahan dari guru
}

export interface VideoValidationResult {
  isValid: boolean;
  videoId?: string;
  title?: string;
  privacyStatus?: string; // 'public', 'unlisted', 'private'
  error?: 'not_found' | 'private' | 'invalid_id' | 'api_error' | null;
  errorDetails?: string;
}

export enum ValidationStep {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  VALIDATING_API = 'VALIDATING_API',
  GENERATING_FEEDBACK = 'GENERATING_FEEDBACK',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}