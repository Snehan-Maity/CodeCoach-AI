import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RagPanel } from './rag-panel';

describe('RagPanel', () => {
  let component: RagPanel;
  let fixture: ComponentFixture<RagPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RagPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(RagPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
