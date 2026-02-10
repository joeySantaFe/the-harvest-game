export enum LogStatus {
  LOCKED = 'ENCRYPTED',
  UNLOCKED = 'DECRYPTED',
}

export interface LogEntry {
  id: string;
  chapter: number;
  title: string;
  date: string;
  author: string;
  content: string;
}
