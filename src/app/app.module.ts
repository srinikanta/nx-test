import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxEchartsModule } from 'ngx-echarts';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { TimelineService } from './timeline.service';
import { TimelineComponent } from './timeline.component';
import { SystemTimelineComponent } from './timeline/system-timeline.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { echarts } from './echarts.config';


@NgModule({
  declarations: [
    AppComponent,
    TimelineComponent,
    SystemTimelineComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    NgxEchartsModule.forRoot({ echarts: () => import('echarts') })
  ],
  providers: [TimelineService],
  bootstrap: [AppComponent]
})
export class AppModule { }
