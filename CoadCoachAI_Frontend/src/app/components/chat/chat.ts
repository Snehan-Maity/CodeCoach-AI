import { Component, ViewChild, ElementRef, AfterViewChecked, NgZone, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageComponent } from '../message/message';
import { Chat, ChatMessage } from '../../services/chat';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  fileName?: string;
  fileType?: string;
  fileSize?: string;  // Added
  fileContent?: string;  // ← Added
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.scss'
})
export class ChatComponent implements AfterViewChecked, OnInit {
  @ViewChild('messagesArea') messagesArea!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  messages: Message[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  selectedFile: File | null = null;
  selectedFileContent: string = '';
  private shouldScroll = false;
  currentSessionId: string = '';

  constructor(
    private chatService: Chat,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Create a fresh session on load
    this.createNewSession();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  scrollToBottom() {
    try {
      const el = this.messagesArea.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  createNewSession(): void {
    this.chatService.createSession().subscribe({
      next: (session) => {
        this.currentSessionId = session.sessionId;
        this.messages = [];
       this.chatService.triggerSessionsRefresh();   // added
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to create session:', err)
    });
  }

  loadSession(sessionId: string): void {
    this.chatService.getSession(sessionId).subscribe({
      next: (session) => {
        this.currentSessionId = session.sessionId;
        this.messages = session.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date()
        }));
        this.shouldScroll = true;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load session:', err)
    });
  }

  useSuggestion(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  onEnter(event: any) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }


    // ── File handling ─────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Please select a file under 2MB.');
      return;
    }

    this.selectedFile = file;
    this.readFileContent(file);
  }

  readFileContent(file: File): void {
    const reader = new FileReader();

    reader.onload = (e) => {
      this.ngZone.run(() => {
        this.selectedFileContent = e.target?.result as string;
      });
    };

    reader.onerror = () => {
      console.error('Failed to read file');
      this.selectedFileContent = '';
    };

    // Read as text for code/text files
    reader.readAsText(file);
  }

  removeFile(): void {
    this.selectedFile = null;
    this.selectedFileContent = '';
    // Reset file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  getFileExtension(): string {
    if (!this.selectedFile) return '';
    const parts = this.selectedFile.name.split('.');
    return parts[parts.length - 1].toUpperCase();
  }

  getFileTypeClass(): string {
    const ext = this.getFileExtension().toLowerCase();
    const map: { [key: string]: string } = {
      pdf: 'badge-pdf',
      py: 'badge-python',
      js: 'badge-js',
      ts: 'badge-ts',
      java: 'badge-java',
      cpp: 'badge-cpp',
      c: 'badge-cpp',
      html: 'badge-html',
      css: 'badge-css',
      json: 'badge-json',
      md: 'badge-md',
      txt: 'badge-txt'
    };
    return map[ext] || 'badge-default';
  }

  getFileSize(): string {
    if (!this.selectedFile) return '';
    const bytes = this.selectedFile.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Send message ───────────────────────────────────────────────
  async sendMessage() {
    const text = this.userInput.trim();
    if ((!text && !this.selectedFile) || this.isLoading) return;

    // Build display message for user bubble
    const userMessage: Message = {
      role: 'user',
      content: text || `Please analyze this file: ${this.selectedFile?.name}`,
      timestamp: new Date(),
      fileName: this.selectedFile?.name,
      fileType: this.getFileExtension(),
      fileSize: this.getFileSize(),
      fileContent: this.selectedFileContent   // Added
    };

    // Push the full userMessage, not a plain object  (Added)
    this.messages.push(userMessage);
    this.userInput = '';
    this.isLoading = true;
    this.shouldScroll = true;
    this.cdr.detectChanges();

    const textarea = document.querySelector('textarea');
    if (textarea) textarea.style.height = 'auto';

    // Build the API message — inject file content into the message
    let apiContent = text;
    if (this.selectedFile && this.selectedFileContent) {
      const ext = this.getFileExtension().toLowerCase();
      apiContent = `${text ? text + '\n\n' : ''}I have attached a file named "${this.selectedFile.name}".\n\nFile contents:\n\`\`\`${ext}\n${this.selectedFileContent}\n\`\`\``;
    }

     // Save user message to DB
    if (this.currentSessionId) {
      this.chatService.saveUserMessage(this.currentSessionId, apiContent).subscribe();
    }

    // Build history BEFORE adding the empty assistant message
    const history: ChatMessage[] = this.messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    history.push({ role: 'user', content: apiContent });

    // Clear file after sending
    const sentFile = this.selectedFile;
    this.removeFile();

    // Add empty assistant bubble to stream into
    this.messages.push({
      role: 'assistant',
      content: '',
      timestamp: new Date()
    });

    const assistantIndex = this.messages.length - 1;
    this.cdr.detectChanges();

    await this.chatService.streamChat(
      history,

      this.currentSessionId,
      // onToken — run inside Angular zone so UI updates per token (for every word)
      (token: string) => {
        this.ngZone.run(() => {
          this.messages[assistantIndex].content += token;
          this.shouldScroll = true;
          this.cdr.detectChanges();
        });
      },

      // onDone
      () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.shouldScroll = true;
          this.cdr.detectChanges();
        });
      },


      // onError
      (err: any) => {
        this.ngZone.run(() => {
          this.messages[assistantIndex].content = `⚠️ Error: ${err}`;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    );
  }

  clearChat() {
    this.messages = [];
    this.removeFile();
    this.cdr.detectChanges();
  }

  async askFromDocument(data: { question: string; documentId: string; fileName: string }): Promise<void> {
  if (this.isLoading) return;

  // Show user message
  this.messages.push({
    role: 'user',
    content: `📄 From "${data.fileName}": ${data.question}`,
    timestamp: new Date()
  });

  this.isLoading = true;
  this.shouldScroll = true;
  this.cdr.detectChanges();

  // Add empty assistant bubble
  this.messages.push({
    role: 'assistant',
    content: '',
    timestamp: new Date()
  });

  const assistantIndex = this.messages.length - 1;

  try {
    const response = await fetch('http://localhost:3000/api/chat/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: data.question,
        documentId: data.documentId,
        sessionId: this.currentSessionId
      })
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              this.ngZone.run(() => {
                this.messages[assistantIndex].content += data.token;
                this.shouldScroll = true;
                this.cdr.detectChanges();
              });
            }
            if (data.done || data.error) {
              this.ngZone.run(() => {
                if (data.error) this.messages[assistantIndex].content = `⚠️ ${data.error}`;
                this.isLoading = false;
                this.cdr.detectChanges();
              });
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    this.ngZone.run(() => {
      this.messages[assistantIndex].content = '⚠️ RAG request failed.';
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }
}

}
