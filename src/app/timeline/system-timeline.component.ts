import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import type { EChartsOption, SeriesOption } from 'echarts';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import {
  TimelineDataService,
  TimelineEvent,
  EventStatus,
} from '../services/timeline-data.service';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: string[] = [
  'Prev Day EOD',
  'Cash Px Drop',
  'Derivs LN',
  'Cash Px Drop 2',
  'Treasury EOD',
  'FX Rates',
  'Derivs US',
];

const STATUS_COLOR: Record<EventStatus, string> = {
  OK: '#00e676',
  WARNING: '#ffca28',
  ERROR: '#ef5350',
};

const AXIS_START = '07:00';
const AXIS_END = '18:00';
const REFRESH_MS = 30_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function fmtTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export interface StatusMeta {
  key: EventStatus;
  color: string;
}

@Component({
  selector: 'app-system-timeline',
  templateUrl: './system-timeline.component.html',
  styleUrls: ['./system-timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemTimelineComponent implements OnInit, OnDestroy {

  // ── Template bindings ────────────────────────────────────────────────────

  chartOptions: EChartsOption = {};
  mergeOptions: EChartsOption | null = null;

  filters: Record<EventStatus, boolean> = { OK: true, WARNING: true, ERROR: true };

  lastUpdated = '--:--';
  nowLabel = '';

  readonly statusList: StatusMeta[] = [
    { key: 'OK',      color: STATUS_COLOR['OK']      },
    { key: 'WARNING', color: STATUS_COLOR['WARNING']  },
    { key: 'ERROR',   color: STATUS_COLOR['ERROR']    },
  ];

  // ── Private state ────────────────────────────────────────────────────────

  private allEvents: TimelineEvent[] = [];
  private sub!: Subscription;
  private initialized = false;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  constructor(
    private readonly svc: TimelineDataService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.sub = interval(REFRESH_MS).pipe(
      startWith(0),
      switchMap(() => this.svc.getEvents()),
    ).subscribe((events: TimelineEvent[]) => {
      this.allEvents = events;
      this.buildChart();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ── Public methods (template) ────────────────────────────────────────────

  toggleFilter(status: EventStatus): void {
    this.filters[status] = !this.filters[status];
    this.buildChart();
  }

  onChartInit(_ec: unknown): void {
    // Store echarts instance here if you need imperative API (resize, etc.)
  }

  // ── Chart builder ────────────────────────────────────────────────────────

  private buildChart(): void {
    const now = new Date();
    this.nowLabel    = `NOW ${fmtTime(now)}`;
    this.lastUpdated = fmtTime(now);

    const filtered = this.allEvents.filter(e => this.filters[e.status]);

    const statuses: EventStatus[] = ['OK', 'WARNING', 'ERROR'];

    const series: SeriesOption[] = statuses.map((status, idx) => {
      const points = filtered
        .filter(e => e.status === status)
        .map(e => ({
          value: [toDate(e.time).getTime(), e.category] as [number, string],
          label: {
            show: true,
            formatter: e.time,
            color: '#cdd6f4',
            fontSize: 11,
            distance: 8,
            position: 'right' as const,
          },
        }));

      return {
        name: status,
        type: 'scatter' as const,
        symbolSize: 16,
        itemStyle: {
          color: STATUS_COLOR[status],
          borderColor: '#ffffff',
          borderWidth: 1,
        },
        data: points,
        // Attach the NOW markLine only to the first series to avoid duplication
        ...(idx === 0
          ? {
              markLine: {
                silent: true,
                symbol: ['none', 'none'],
                lineStyle: { color: '#5bc4ff', type: 'dashed' as const, width: 1.5 },
                label: {
                  show: true,
                  formatter: this.nowLabel,
                  color: '#5bc4ff',
                  fontSize: 12,
                  fontWeight: 'bold' as const,
                  position: 'insideStartTop' as const,
                },
                data: [{ xAxis: now.getTime() }],
              },
            }
          : {}),
      };
    });

    const opts: EChartsOption = {
      backgroundColor: '#0d1117',
      animation: false,

      grid: {
        top: 24,
        left: 160,
        right: 60,
        bottom: 40,
      },

      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          const [ts, cat] = p.value as [number, string];
          return `<b style="color:#cdd6f4">${cat}</b><br/>
                  <span style="color:#8892b0">${fmtTime(new Date(ts))}</span>
                  &nbsp;—&nbsp;
                  <span style="color:${STATUS_COLOR[p.seriesName as EventStatus]}">${p.seriesName}</span>`;
        },
        backgroundColor: '#1e2333',
        borderColor: '#3a3f5c',
        textStyle: { color: '#cdd6f4' },
      },

      xAxis: {
        type: 'time',
        min: toDate(AXIS_START).getTime(),
        max: toDate(AXIS_END).getTime(),
        interval: 60 * 60 * 1000, // 1-hour ticks
        axisLabel: {
          formatter: (val: number) => fmtTime(new Date(val)),
          color: '#8892b0',
          fontSize: 11,
        },
        axisLine:  { lineStyle: { color: '#2a2e45' } },
        splitLine: { show: true, lineStyle: { color: '#1e2333', type: 'dashed' } },
        axisTick:  { show: false },
      },

      yAxis: {
        type: 'category',
        data: CATEGORIES,
        inverse: true,
        axisLabel: { color: '#cdd6f4', fontSize: 12, fontWeight: 'bold' },
        axisLine:  { lineStyle: { color: '#2a2e45' } },
        splitLine: { show: true, lineStyle: { color: '#1e2333', type: 'dashed' } },
        axisTick:  { show: false },
      },

      series,
    };

    if (!this.initialized) {
      this.chartOptions = opts;
      this.initialized = true;
    } else {
      this.mergeOptions = opts;
    }

    this.cdr.markForCheck();
  }
}