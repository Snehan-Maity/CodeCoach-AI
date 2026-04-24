import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chat, Session } from '../../services/chat';
import { RagPanel } from '../rag-panel/rag-panel';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RagPanel],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit {
  @Output() sessionSelected = new EventEmitter<string>();
  @Output() newChatClicked = new EventEmitter<void>();// Add Output:
  @Output() ragQuestion = new EventEmitter<{ question: string; documentId: string; fileName: string }>();

// Add method:
onAskFromDoc(data: { question: string; documentId: string; fileName: string }): void {
  this.ragQuestion.emit(data);
}

  sessions: Session[] = [];
  activeId: string = '';

  constructor(
    private chatService: Chat,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSessions();

    this.chatService.sessionsRefresh$.subscribe(() => {
    this.loadSessions();
  });
  }

  // loadSessions(): void {
  //   this.chatService.getSessions().subscribe({
  //     next: (sessions) => { this.sessions = sessions; },
  //     error: (err) => console.error('Failed to load sessions:', err)
  //   });
  // }

  loadSessions(): void {
  this.chatService.getSessions().subscribe({
    next: (sessions) => {
      this.sessions = [...sessions];
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Failed to load sessions:', err)
  });
}

  trackBySessionId(index: number, session: Session): string {
  return session.sessionId;
}

  newChat(): void {
    this.activeId = '';
    this.newChatClicked.emit();

    // fallback refresh after the new session is created
    // setTimeout(() => {
    //   this.loadSessions();
    // }, 100);
  }

  selectSession(sessionId: string): void {
    this.activeId = sessionId;
    this.sessionSelected.emit(sessionId);
  }

//   deleteSession(event: MouseEvent, sessionId: string): void {
//   event.stopPropagation();
//   // event.preventDefault();

//   this.chatService.deleteSession(sessionId).subscribe({
//     next: () => {
//       this.sessions = this.sessions.filter(s => s.sessionId !== sessionId);
//       if (this.activeId === sessionId) {
//         this.activeId = '';
//         this.newChatClicked.emit();
//       }
//       this.chatService.triggerSessionsRefresh();
//     },
//     error: (err) => {
//       console.error('Failed to delete session:', err);
//     }
//   });
// }


  deleteSession(event: MouseEvent, sessionId: string): void {
  event.stopPropagation();

  const wasActive = this.activeId === sessionId;

  this.chatService.deleteSession(sessionId).subscribe({
    next: () => {
      // instant UI update
      this.sessions = this.sessions.filter(s => s.sessionId !== sessionId);

      if (wasActive) {
        this.activeId = '';
        this.newChatClicked.emit();
      }

      // force sync with backend so stale item doesn't come back
      this.loadSessions();
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Failed to delete session:', err);
    }
  });
}

  setActive(sessionId: string): void {
    this.activeId = sessionId;
  }

  getTimeLabel(date: Date): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString();
  }
}