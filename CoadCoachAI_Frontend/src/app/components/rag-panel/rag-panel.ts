import { Component, OnInit, Output, EventEmitter, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface UploadedDocument {
  _id: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  uploadedAt: Date;
}

@Component({
  selector: 'app-rag-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './rag-panel.html',
  styleUrl: './rag-panel.scss',
})
export class RagPanel implements OnInit {
  @Output() askFromDoc = new EventEmitter<{ question: string; documentId: string; fileName: string }>();

  documents: UploadedDocument[] = [];
  selectedDocId: string = '';
  question: string = '';
  isUploading: boolean = false;
  uploadSuccess: string = '';
  uploadError: string = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.http.get<UploadedDocument[]>(`${this.apiUrl}/documents`).subscribe({
      next: (docs) => { this.documents = docs; },
      error: (err) => console.error('Failed to load documents:', err)
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.uploadError = 'Only PDF files are supported.';
      return;
    }

    this.uploadPDF(file);
    input.value = '';
  }

  uploadPDF(file: File): void {
    this.isUploading = true;
    this.uploadError = '';
    this.uploadSuccess = '';

    const formData = new FormData();
    formData.append('pdf', file);

    this.http.post<any>(`${this.apiUrl}/documents/upload`, formData).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.isUploading = false;
          this.uploadSuccess = `✅ "${res.fileName}" uploaded (${res.totalChunks} chunks)`;
          this.loadDocuments();
          setTimeout(() => { this.uploadSuccess = ''; }, 4000);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isUploading = false;
          this.uploadError = err.error?.error || 'Upload failed.';
        });
      }
    });
  }

  deleteDocument(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.http.delete(`${this.apiUrl}/documents/${id}`).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d._id !== id);
        if (this.selectedDocId === id) this.selectedDocId = '';
      }
    });
  }

  askQuestion(): void {
    if (!this.question.trim() || !this.selectedDocId) return;
    const doc = this.documents.find(d => d._id === this.selectedDocId);
    this.askFromDoc.emit({
      question: this.question.trim(),
      documentId: this.selectedDocId,
      fileName: doc?.fileName || ''
    });
    this.question = '';
  }

  getFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  selectDoc(id: string): void {
    this.selectedDocId = this.selectedDocId === id ? '' : id;
  }
}