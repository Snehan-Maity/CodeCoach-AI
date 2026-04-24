import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  sessionId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDetail extends Session {
  messages: ChatMessage[];
}

@Injectable({ providedIn: 'root' })
export class Chat {
  private apiUrl = 'http://localhost:3000/api';

  private sessionsRefreshSource = new Subject<void>();
  sessionsRefresh$ = this.sessionsRefreshSource.asObservable();

  triggerSessionsRefresh(): void {
    this.sessionsRefreshSource.next();
  }

  constructor(
    private http: HttpClient
  ) {}

  // ── Sessions ──────────────────────────────────────────────────

  getUserId(): string {
    let userId = localStorage.getItem('userId');

    if (!userId) {
      userId = crypto.randomUUID();   // modern browsers
      localStorage.setItem('userId', userId);
    }
    // console.log('USER ID:', userId);
    return userId;
  } 

  createSession(): Observable<Session> {
    return this.http.post<Session>(`${this.apiUrl}/sessions`, {
     userId: this.getUserId()
    });
  }

  getSessions(): Observable<Session[]> {
  return this.http.get<Session[]>(
    `${this.apiUrl}/sessions?userId=${this.getUserId()}`
  );
  }

  getSession(sessionId: string): Observable<SessionDetail> {
  return this.http.get<SessionDetail>(
    `${this.apiUrl}/sessions/${sessionId}?userId=${this.getUserId()}`
  );
}

  // getSession(sessionId: string): Observable<SessionDetail> {
  //   return this.http.get<SessionDetail>(`${this.apiUrl}/sessions/${sessionId}`);
  // }

  // deleteSession(sessionId: string): Observable<any> {
  //   return this.http.delete(`${this.apiUrl}/sessions/${sessionId}`);
  // }
  
//   deleteSession(sessionId: string): Observable<any> {
//   return this.http.delete(
//     `${this.apiUrl}/sessions/${sessionId}?userId=${this.getUserId()}`
//   );
// }

deleteSession(sessionId: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/sessions/${sessionId}`, {
    params: { userId: this.getUserId() }
  });
}

  // saveUserMessage(sessionId: string, content: string): Observable<any> {
  //   return this.http.post(
  //     `${this.apiUrl}/sessions/${sessionId}/messages`,
  //     { role: 'user', content }
  //   );
  // }

  saveUserMessage(sessionId: string, content: string): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/sessions/${sessionId}/messages`,
    {
      role: 'user',
      content,
      userId: this.getUserId()
    }
  );
}

  // ── Streaming ─────────────────────────────────────────────────

  async streamChat(
    messages: ChatMessage[],
    sessionId: string,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, sessionId, userId: this.getUserId()})
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) onToken(data.token);
              if (data.done) onDone();
              if (data.error) onError(data.error);
            } catch {}
          }
        }
      }
    } catch (err) {
      onError('Connection failed. Is the backend running?');
    }
  }
}