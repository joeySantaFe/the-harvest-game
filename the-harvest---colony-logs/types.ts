export enum LogStatus {
  LOCKED = 'ENCRYPTED',
  UNLOCKED = 'DECRYPTED',
  CORRUPTED = 'CORRUPTED'
}

export interface LogEntry {
  id: string;
  chapter: number;
  title: string;
  date: string; // Stardate or similar
  content: string;
  status: LogStatus;
  author: string;
}

export interface SystemState {
  currentView: 'BOOT' | 'MENU' | 'READER';
  selectedLogId: string | null;
}