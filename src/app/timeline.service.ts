import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type TimelineStatus = 'ok' | 'warn' | 'error';

export interface TimelineEvent {
  row: number;
  minute: number;
  time: string;
  status: TimelineStatus;
}

export interface TimelineData {
  rows: string[];
  events: TimelineEvent[];
}

@Injectable({ providedIn: 'root' })
export class TimelineService {
  private readonly mockTimelineData: TimelineData = {
    rows: [
      'Prev Day EOD',
      'Cash Px Drop',
      'Derivs LN',
      'Cash Px Drop 2',
      'Treasury EOD',
      'FX Rates',
      'Derivs US'
    ],
    events: [
      { row: 0, minute: 210, time: '10:30', status: 'ok' },
      { row: 1, minute: 270, time: '11:30', status: 'ok' },
      { row: 2, minute: 330, time: '12:30', status: 'error' },
      { row: 3, minute: 450, time: '14:30', status: 'ok' },
      { row: 4, minute: 480, time: '15:00', status: 'warn' },
      { row: 5, minute: 630, time: '17:30', status: 'ok' }
    ]
  };

  getTimelineData(): Observable<TimelineData> {
    // Future REST API replacement:
    // return this.http.get<TimelineData>('/api/timeline');
    return of(this.mockTimelineData).pipe(delay(600));
  }
}
