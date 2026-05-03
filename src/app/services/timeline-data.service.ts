import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export type EventStatus = 'OK' | 'WARNING' | 'ERROR';

export interface TimelineEvent {
  id: string;
  category: string;
  time: string;   // "HH:mm"
  status: EventStatus;
}

@Injectable({ providedIn: 'root' })
export class TimelineDataService {

  /** Returns mock data simulating an API response */
 getEvents(): Observable<TimelineEvent[]> {
    return of([
      { id: 'e1', category: 'Prev Day EOD',  time: '10:30', status: 'OK'      },
      { id: 'e2', category: 'Cash Px Drop',  time: '11:30', status: 'OK'      },
      { id: 'e3', category: 'Derivs LN',     time: '12:30', status: 'WARNING' },
      { id: 'e4', category: 'Cash Px Drop 2',time: '14:30', status: 'OK'      },
      { id: 'e5', category: 'Treasury EOD',  time: '15:00', status: 'WARNING' },
      { id: 'e6', category: 'FX Rates',      time: '17:30', status: 'OK'      },
      { id: 'e7', category: 'Derivs US',     time: '18:00', status: 'ERROR'   },
    ]);
  }
}