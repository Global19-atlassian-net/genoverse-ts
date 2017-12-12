import Genoverse from './../../genoverse';
import TrackView from '../view';
import {GeneViewProperties} from './../../interfaces/gene';
import * as $ from 'jquery';

export default abstract class TranscriptView extends TrackView {
  
  utrHeight: number;
  intronLineWidth: number;
  intronStyle: string;

  constructor(genoverse: Genoverse, properties?: GeneViewProperties){
    super(genoverse, properties);
  }

  drawBackground(feature: any, canvasContext: CanvasRenderingContext2D, imgData: any): void {
    $.noop;
  }

  decorateFeature(feature: any, featureContext: any, scale: any) {
    $.noop;
  }

  drawFeature(transcript: any, featureContext: any, labelContext: any, scale: number) {
    this.setFeatureColor(transcript);
    const exons     = ($.isArray(transcript.exons) ? $.extend(true, [], transcript.exons) : $.map($.extend(true, {}, transcript.exons || {}), function (e) { return e; })).sort(function (a: any, b: any) { return a.start - b.start; });
    const cds       = ($.isArray(transcript.cds)   ? $.extend(true, [], transcript.cds)   : $.map($.extend(true, {}, transcript.cds   || {}), function (c) { return c; })).sort(function (a: any, b: any) { return a.start - b.start; });
    const add       = Math.max(scale, this.widthCorrection);
    const coding: any = {};
    let cdsStart  = 9e99;
    let cdsEnd    = -9e99;
    const utrHeight = this.utrHeight;
    const utrOffset = (transcript.height - utrHeight) / 2;

    // Get intron lines to be drawn off the left and right edges of the image
    if (!exons.length || exons[0].start > transcript.start) {
      exons.unshift({ start: transcript.start, end: transcript.start });
    }

    if (!exons.length || exons[exons.length - 1].end < transcript.end) {
      exons.push({ start: transcript.end, end: transcript.end });
    }

    featureContext.fillStyle = featureContext.strokeStyle = transcript.color || this.color;

    for (let i = 0; i < cds.length; i++) {
      let x = transcript.x + (cds[i].start - transcript.start) * scale;
      let w = Math.max((cds[i].end - cds[i].start) * scale + add, this.minScaledWidth);

      coding[cds[i].start + ':' + cds[i].end] = true;

      cdsStart = Math.min(cdsStart, cds[i].start);
      cdsEnd   = Math.max(cdsEnd,   cds[i].end);

      if (x > this.width || x + w < 0) {
        continue;
      }

      featureContext.fillRect(x, transcript.y, w, transcript.height);
    }

    for (let i = 0; i < exons.length; i++) {
      // No need to draw the strokeRect if it is entirely inside a fillRect
      if (!coding[exons[i].start + ':' + exons[i].end]) {
        let x = transcript.x + (exons[i].start - transcript.start) * scale;
        let w = Math.max((exons[i].end - exons[i].start) * scale + add, this.minScaledWidth);

        if (!(x > this.width || x + w < 0)) {
          featureContext.lineWidth = 1;
          featureContext.strokeRect(x, transcript.y + utrOffset, w, utrHeight);
        }
      }

      if (i) {
        let x = transcript.x + (exons[i - 1].end - transcript.start) * scale + add;
        let w = (exons[i].start - exons[i - 1].end) * scale - add;

        if (x > this.width || x + w < 0) {
          continue;
        }

        this.drawIntron({
          x      : x,
          y      : transcript.y + transcript.height / 2,
          width  : w,
          height : (transcript.height - (exons[i - 1].end >= cdsStart && exons[i].start <= cdsEnd ? 0 : 3)) / 2 * (transcript.strand > 0 ? -1 : 1)
        }, featureContext);
      }
    }

    if (this.labels && transcript.label) {
      this.drawLabel(transcript, labelContext, scale);
    }
  }

  drawIntron(intron: any, context: any) {
    const coords = this.getTruncatedIntronCoords(intron);

    if (!coords) {
      return;
    }

    context.beginPath();
    context.moveTo(coords.x1, coords.y1);

    context.lineWidth = this.intronLineWidth;

    switch (this.intronStyle) {
      case 'line':
        context.lineTo(coords.x3, coords.y1);
        break;
      case 'hat':
        context.lineTo(coords.x2, coords.y2);
        context.lineTo(coords.x3, coords.y3);
        break;
      case 'curve':
        context.quadraticCurveTo(coords.x2, coords.y2, coords.x3, coords.y3);
        break;
      default: break;
    }

    context.stroke();
  }

  getTruncatedIntronCoords(intron: any) {
    let y1 = intron.y; // y coord of the ends of the line (half way down the exon box)
    let y3 = y1;

    if (this.intronStyle === 'line') {
      this.truncateForDrawing(intron);
      y1 += 0.5; // Sharpen line
    }

    let x1 = intron.x;                // x coord of the right edge of the first exon
    let x3 = intron.x + intron.width; // x coord of the left edge of the second exon

    // Skip if completely outside the image's region
    if (x3 < 0 || x1 > this.width) {
      return false;
    }

    let x2, y2, xMid, yScale;

    // Truncate the coordinates of the line being drawn, so it is inside the image's region
    if (this.intronStyle === 'hat') {
      xMid   = (x1 + x3) / 2;
      x2     = xMid;                     // x coord of the peak of the hat/curve
      y2     = intron.y + intron.height; // y coord of the peak of the hat/curve (level with the top (forward strand) or bottom (reverse strand) of the exon box)
      yScale = (y2 - y1) / (xMid - x1);  // Scale factor for recalculating coords if points lie outside the image region

      if (xMid < 0) {
        y2 = intron.y + (yScale * x3);
        x2 = 0;
      } else if (xMid > this.width) {
        y2 = intron.y + (yScale * (this.width - intron.x));
        x2 = this.width;
      }

      if (x1 < 0) {
        y1 = xMid < 0 ? y2 : intron.y - (yScale * intron.x);
        x1 = 0;
      }

      if (x3 > this.width) {
        y3 = xMid > this.width ? y2 : y2 - (yScale * (this.width - x2));
        x3 = this.width;
      }
    } else if (this.intronStyle === 'curve') {
      // TODO: try truncating when style is curve
      x2 = intron.x + intron.width / 2;
      y2 = intron.y + intron.height;
    }

    return {
      x1: x1, y1: y1,
      x2: x2, y2: y2,
      x3: x3, y3: y3
    };
  }
}
