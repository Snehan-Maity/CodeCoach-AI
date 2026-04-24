import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from './components/sidebar/sidebar';
import { ChatComponent } from './components/chat/chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ Sidebar, ChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}