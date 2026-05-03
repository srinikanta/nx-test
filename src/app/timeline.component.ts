import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';

type TimelineStatus = 'ok' | 'warn' | 'error';

interface TimelineEvent {
  row: number;
  minute: number;
  time: string;
  status: TimelineStatus;
}

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnDestroy {
  readonly startHour = 7;
  readonly endHour = 18;
  readonly totalMinutes = (this.endHour - this.startHour) * 60;
  readonly minScrubWindowMinutes = 120;
  readonly defaultScrubWindowMinutes = 240;
  readonly scrubStepMinutes = 60;

  @ViewChild('scrubberTrack') scrubberTrack?: ElementRef<HTMLElement>;

  nowMinutes = 212;
  nowLabel = 'NOW 10:32';
  lastUpdatedTime = '10:32:45';
  clockTime = '10:32:45';

  readonly rows = [
    'Prev Day EOD',
    'Cash Px Drop',
    'Derivs LN',
    'Cash Px Drop 2',
    'Treasury EOD',
    'FX Rates',
    'Derivs US'
  ];

  readonly events: TimelineEvent[] = [
    { row: 0, minute: 210, time: '10:30', status: 'ok' },
    { row: 1, minute: 270, time: '11:30', status: 'ok' },
    { row: 2, minute: 330, time: '12:30', status: 'error' },
    { row: 3, minute: 450, time: '14:30', status: 'ok' },
    { row: 4, minute: 480, time: '15:00', status: 'warn' },
    { row: 5, minute: 630, time: '17:30', status: 'ok' }
  ];

  readonly scrubberLabels = [
    { time: '08:00', left: 12.5 },
    { time: '10:00', left: 29.5 },
    { time: '12:00', left: 46.5 },
    { time: '14:00', left: 63.5 },
    { time: '16:00', left: 80.5 }
  ];

  statusFilters: Record<TimelineStatus, boolean> = {
    ok: true,
    warn: true,
    error: true
  };

  selectedRowIndex = 1;
  scrubStartMinute = 0;
  scrubEndMinute = this.totalMinutes;
  autoRefreshEnabled = true;
  autoRefreshIntervalSeconds = 30;
  isRefreshMenuOpen = false;

  readonly refreshIntervals = [15, 30, 60];

  option: any;
  private autoRefreshTimerId?: number;
  private clockTimerId?: number;
  private activeScrubHandle: 'start' | 'end' | null = null;
  private readonly pointerMoveListener = (event: PointerEvent) => this.updateScrubberHandle(event);
  private readonly pointerUpListener = () => this.stopScrubberDrag();

  ngOnInit(): void {
    this.refreshTimeline();
    this.startClock();
    this.restartAutoRefreshTimer();
  }

  ngOnDestroy(): void {
    this.clearAutoRefreshTimer();
    window.clearInterval(this.clockTimerId);
    this.removeScrubberListeners();
  }

  get nowPositionRatio(): number {
    return this.clamp(
      (this.nowMinutes - this.scrubStartMinute) / this.scrubWindowMinutes,
      0,
      1
    );
  }

  get isNowInView(): boolean {
    return this.nowMinutes >= this.scrubStartMinute && this.nowMinutes <= this.scrubEndMinute;
  }

  get scrubWindowMinutes(): number {
    return this.scrubEndMinute - this.scrubStartMinute;
  }

  get scrubStartPercent(): number {
    return (this.scrubStartMinute / this.totalMinutes) * 100;
  }

  get scrubEndPercent(): number {
    return (this.scrubEndMinute / this.totalMinutes) * 100;
  }

  get scrubWidthPercent(): number {
    return this.scrubEndPercent - this.scrubStartPercent;
  }

  selectRow(index: number): void {
    this.selectedRowIndex = index;
  }

  toggleStatus(status: TimelineStatus, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.statusFilters = {
      ...this.statusFilters,
      [status]: input.checked
    };
    this.option = this.buildChartOption();
  }

  scrollLeft(): void {
    this.moveScrubWindow(-this.scrubStepMinutes);
  }

  scrollRight(): void {
    this.moveScrubWindow(this.scrubStepMinutes);
  }

  startScrubberDrag(handle: 'start' | 'end', event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.activeScrubHandle = handle;
    window.addEventListener('pointermove', this.pointerMoveListener);
    window.addEventListener('pointerup', this.pointerUpListener);
  }

  onScrubberTrackPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.range-handle')) {
      return;
    }

    const targetMinute = this.minuteFromPointer(event);
    const windowMinutes =
      this.scrubWindowMinutes >= this.totalMinutes
        ? this.defaultScrubWindowMinutes
        : this.scrubWindowMinutes;

    this.setScrubRange(targetMinute - windowMinutes / 2, targetMinute + windowMinutes / 2);
  }

  toggleRefreshMenu(): void {
    this.isRefreshMenuOpen = !this.isRefreshMenuOpen;
  }

  setRefreshInterval(seconds: number): void {
    this.autoRefreshIntervalSeconds = seconds;
    this.isRefreshMenuOpen = false;
    this.autoRefreshEnabled = true;
    this.refreshTimeline();
    this.restartAutoRefreshTimer();
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;

    if (this.autoRefreshEnabled) {
      this.refreshTimeline();
      this.restartAutoRefreshTimer();
      return;
    }

    this.clearAutoRefreshTimer();
  }

  getColor(status: TimelineStatus): string {
    return {
      ok: '#4ade80',
      warn: '#facc15',
      error: '#ff5261'
    }[status];
  }

  getStatusLabel(status: TimelineStatus): string {
    return {
      ok: 'SUCCESS',
      warn: 'DELAYED',
      error: 'FAILED'
    }[status];
  }

  private buildChartOption(): any {
    const filteredEvents = this.events.filter(event => this.statusFilters[event.status]);
    const pointData = filteredEvents.map(event => ({
      name: event.time,
      value: [event.minute, event.row + 0.5],
      event,
      itemStyle: {
        color: this.getColor(event.status),
        shadowBlur: 18,
        shadowColor: this.getColor(event.status)
      },
      label: {
        color: event.status === 'warn' ? '#d7d9e4' : '#d9e2f1'
      }
    }));

    const glowData = filteredEvents.map(event => ({
      value: [event.minute, event.row + 0.5],
      itemStyle: {
        color: this.getColor(event.status),
        opacity: event.status === 'warn' ? 0.15 : 0.18,
        shadowBlur: 22,
        shadowColor: this.getColor(event.status)
      }
    }));

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        left: 28,
        right: 28,
        top: 34,
        bottom: 0,
        containLabel: false,
        show: true,
        borderColor: 'rgba(148, 163, 184, 0.36)',
        borderWidth: 1
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(5, 13, 25, 0.94)',
        borderColor: 'rgba(74, 222, 128, 0.35)',
        borderWidth: 1,
        textStyle: {
          color: '#e5edf9',
          fontSize: 12
        },
        formatter: (params: any) => {
          const event = params.data?.event as TimelineEvent | undefined;
          if (!event) {
            return '';
          }

          return `${this.rows[event.row]}<br/>${event.time} &nbsp;—&nbsp;
          <span style="color:${this.getColor(event.status)}">${this.getStatusLabel(event.status)}</span>`;
        }
      },
      xAxis: {
        type: 'value',
        min: this.scrubStartMinute,
        max: this.scrubEndMinute,
        interval: 60,
        position: 'top',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#c1c7d4',
          fontSize: 13,
          fontWeight: 400,
          margin: 8,
          formatter: (value: number) => this.formatMinuteLabel(value)
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.25)',
            type: 'dashed',
            width: 1
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: this.rows.length,
        interval: 1,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.18)',
            width: 1
          }
        }
      },
      series: [
        {
          type: 'scatter',
          symbol: 'circle',
          symbolSize: 28,
          silent: true,
          z: 2,
          data: glowData
        },
        {
          type: 'scatter',
          symbol: 'circle',
          symbolSize: 12,
          z: 4,
          label: {
            show: true,
            position: 'right',
            distance: 8,
            formatter: (params: any) => params.data.name,
            fontSize: 13,
            fontWeight: 400
          },
          data: pointData,
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            precision: 0,
            lineStyle: {
              color: '#19a8ff',
              width: 1,
              type: 'dashed'
            },
            label: {
              show: false,
              position: 'end',
              formatter: '{b}',
              color: '#21aaff',
              fontSize: 13,
              distance: 8
            },
            data: [
              {
                name: this.nowLabel,
                xAxis: this.nowMinutes
              }
            ]
          }
        }
      ]
    };
  }

  private refreshTimeline(): void {
    const now = new Date();
    this.updateClock(now);
    this.lastUpdatedTime = this.formatClockTime(now);

    const rawNowMinutes = (now.getHours() - this.startHour) * 60 + now.getMinutes();
    this.nowMinutes = this.clamp(rawNowMinutes, 0, this.totalMinutes);
    this.nowLabel = `NOW ${this.formatClockTime(now, false)}`;
    this.option = this.buildChartOption();
  }

  private startClock(): void {
    this.clockTimerId = window.setInterval(() => {
      this.updateClock(new Date());
    }, 1000);
  }

  private updateClock(date: Date): void {
    this.clockTime = this.formatClockTime(date);
  }

  private restartAutoRefreshTimer(): void {
    this.clearAutoRefreshTimer();

    if (!this.autoRefreshEnabled) {
      return;
    }

    this.autoRefreshTimerId = window.setInterval(() => {
      this.refreshTimeline();
    }, this.autoRefreshIntervalSeconds * 1000);
  }

  private clearAutoRefreshTimer(): void {
    window.clearInterval(this.autoRefreshTimerId);
  }

  private moveScrubWindow(deltaMinutes: number): void {
    if (this.scrubWindowMinutes >= this.totalMinutes) {
      this.setScrubRange(0, this.defaultScrubWindowMinutes);
      return;
    }

    this.setScrubRange(
      this.scrubStartMinute + deltaMinutes,
      this.scrubEndMinute + deltaMinutes
    );
  }

  private updateScrubberHandle(event: PointerEvent): void {
    if (!this.activeScrubHandle) {
      return;
    }

    const minute = this.minuteFromPointer(event);
    if (this.activeScrubHandle === 'start') {
      this.setScrubRange(minute, this.scrubEndMinute);
      return;
    }

    this.setScrubRange(this.scrubStartMinute, minute);
  }

  private stopScrubberDrag(): void {
    this.activeScrubHandle = null;
    this.removeScrubberListeners();
  }

  private removeScrubberListeners(): void {
    window.removeEventListener('pointermove', this.pointerMoveListener);
    window.removeEventListener('pointerup', this.pointerUpListener);
  }

  private setScrubRange(startMinute: number, endMinute: number): void {
    let nextStart = this.clamp(Math.round(startMinute), 0, this.totalMinutes);
    let nextEnd = this.clamp(Math.round(endMinute), 0, this.totalMinutes);

    if (nextEnd - nextStart < this.minScrubWindowMinutes) {
      if (this.activeScrubHandle === 'start') {
        nextStart = nextEnd - this.minScrubWindowMinutes;
      } else {
        nextEnd = nextStart + this.minScrubWindowMinutes;
      }
    }

    if (nextStart < 0) {
      nextEnd -= nextStart;
      nextStart = 0;
    }

    if (nextEnd > this.totalMinutes) {
      nextStart -= nextEnd - this.totalMinutes;
      nextEnd = this.totalMinutes;
    }

    this.scrubStartMinute = this.clamp(nextStart, 0, this.totalMinutes - this.minScrubWindowMinutes);
    this.scrubEndMinute = this.clamp(nextEnd, this.minScrubWindowMinutes, this.totalMinutes);
    this.option = this.buildChartOption();
  }

  private minuteFromPointer(event: PointerEvent): number {
    const track = this.scrubberTrack?.nativeElement;
    if (!track) {
      return 0;
    }

    const rect = track.getBoundingClientRect();
    const ratio = this.clamp((event.clientX - rect.left) / rect.width, 0, 1);
    return ratio * this.totalMinutes;
  }

  private formatMinuteLabel(value: number): string {
    const totalMinutes = this.startHour * 60 + Math.round(value);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private formatClockTime(date: Date, includeSeconds = true): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
