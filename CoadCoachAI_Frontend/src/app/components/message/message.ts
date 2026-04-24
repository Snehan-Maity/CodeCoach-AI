import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../chat/chat';
import { MarkdownPipe } from '../../pipes/markdown-pipe';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  templateUrl: './message.html',
  styleUrl: './message.scss'
})
export class MessageComponent implements AfterViewInit, OnDestroy {
  @Input() message!: Message;

  showFilePreview: boolean = false;
  fileCopied: boolean = false;
  private removeClickListener?: () => void;

  constructor(
    private el: ElementRef<HTMLElement>,
    private ngZone: NgZone
  ) {}

  get isUser(): boolean {
    return this.message.role === 'user';
  }

    // ── File preview modal ─────────────────────────────────────────

  openFilePreview(): void {
    this.showFilePreview = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeFilePreview(): void {
    this.showFilePreview = false;
    document.body.style.overflow = '';
  }

  closeOnOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('file-modal-overlay')) {
      this.closeFilePreview();
    }
  }

  copyFileContent(): void {
    const content = this.message.fileContent ?? '';
    if (!content) return;

    const doFallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      try {
        document.execCommand('copy');
        this.showCopied();
      } catch (e) {
        console.error('Copy failed', e);
      } finally {
        document.body.removeChild(textarea);
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(content)
        .then(() => this.showCopied())
        .catch(() => doFallback());
    } else {
      doFallback();
    }
  }

  showCopied(): void {
    this.ngZone.run(() => {
      this.fileCopied = true;
      setTimeout(() => { this.fileCopied = false; }, 2000);
    });
  }

  // ── Copy button for code blocks ────────────────────────────────

  ngAfterViewInit(): void {
    // Event delegation: works even for buttons created via [innerHTML]
    const host = this.el.nativeElement;

    const handler = async (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const button = target.closest('.copy-btn') as HTMLButtonElement | null;
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const codeBlock = button.closest('.code-block');
      if (!codeBlock) return;

      const codeEl = codeBlock.querySelector('pre code') as HTMLElement | null;
      if (!codeEl) return;

      const text = codeEl.innerText?.trim() || codeEl.textContent?.trim() || '';
      if (!text) return;

      const copied = await this.copyText(text);

      this.showCopyState(button, copied);
      this.showCopyState(button, copied); // Added
    };

    host.addEventListener('click', handler);

    this.removeClickListener = () => {
      host.removeEventListener('click', handler);
    };
  }

  ngOnDestroy(): void {
    this.removeClickListener?.();
    // Clean up body overflow if modal was open
    document.body.style.overflow = '';    // Added
  }

  private async copyText(text: string): Promise<boolean> {
    // First try modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn('Clipboard API failed, falling back to execCommand:', error);
      }
    }

    // Fallback for older/insecure contexts
    return this.fallbackCopy(text);
  }

  private fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Must be visible enough for browser to allow focus
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.zIndex = '-1';

    document.body.appendChild(textarea);

    // Focus the textarea — this is the key fix
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let success = false;

    try {
      success = document.execCommand('copy');
      if (!success) {
        console.warn('execCommand("copy") returned false');
      }
    } catch (error) {
      console.error('Fallback copy failed:', error);
      success = false;
    } finally {
      document.body.removeChild(textarea);
    }

    return success;
  }

  private showCopyState(button: HTMLButtonElement, success: boolean): void {
    const originalText = '⎘ Copy';

    this.ngZone.run(() => {
      if (success) {
        button.innerText = '✓ Copied!';
        button.classList.add('copied');
      } else {
        button.innerText = '✕ Failed';
        button.classList.remove('copied');
      }

      setTimeout(() => {
        button.innerText = originalText;
        button.classList.remove('copied');
      }, 2000);
    });
  }
}