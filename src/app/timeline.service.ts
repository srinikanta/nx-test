import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TimelineService {

  private rows = [
    'Prev Day EOD',
    'Cash Px Drop',
    'Derivs LN',
    'Cash Px Drop 2',
    'Treasury EOD',
    'FX Rates',
    'Derivs US'
  ];

  private statuses = ['ok', 'warn', 'error'];

  getEvents(): Observable<any[]> {

    const events = [];

    for (let i = 0; i < this.rows.length; i++) {
      if (Math.random() > 0.3) {

        const hour = 7 + Math.floor(Math.random() * 11);
        const minute = Math.random() > 0.5 ? '00' : '30';

        events.push({
          time: `${hour}:${minute}`,
          row: this.rows[i],
          status: this.statuses[Math.floor(Math.random() * 3)]
        });
      }
    }

    return of(events).pipe(delay(600));
  }
}