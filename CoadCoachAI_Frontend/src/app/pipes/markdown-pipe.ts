import { Pipe, PipeTransform, inject } from '@angular/core';
import { marked, Renderer } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import hljs from 'highlight.js';

// Custom renderer for code blocks
const renderer = new Renderer();

renderer.code = function(code: any): string {
  let text: string;
  let lang: string;

  if (typeof code === 'object' && code !== null) {
    text = code.text ?? '';
    lang = code.lang ?? '';
  } else {
    text = String(code);
    lang = '';
  }

  const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language: validLang }).value;

  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">${validLang}</span>
      <button type="button" class="copy-btn">⎘ Copy</button>
    </div>
    <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
  </div>`;
};

renderer.codespan = function(code: any): string {
  const text = typeof code === 'object' ? (code.text ?? '') : String(code);
  return `<code class="inline-code">${text}</code>`;
};

marked.use({
  renderer,
  breaks: true,
  gfm: true,
} as any);

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    if (!value) return '';
    try {
      
      const raw = marked.parse(value);
      const html = typeof raw === 'string' ? raw : '';
      // Bypass Angular sanitization so our code block HTML renders fully
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch {
      return value;
    }
  }
}