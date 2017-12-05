/// <reference path="./jquery-mousehold.d.ts" />
/**
 * jQuery mousehold plugin - fires an event while the mouse is clicked down.
 * Additionally, the function, when executed, is passed a single
 * argument representing the count of times the event has been fired during
 * this session of the mouse hold.
 *
 * @author Remy Sharp (leftlogic.com)
 * @date 2006-12-15
 * @example $("img").mousehold(200, function(i){  })
 * @desc Repeats firing the passed function while the mouse is clicked down
 *
 * @name mousehold
 * @type jQuery
 * @param Number timeout The frequency to repeat the event in milliseconds
 * @param Function fn A function to execute
 * @cat Plugin
 */

 import * as $ from '../../node_modules/jquery/dist/jquery.js';
 
 (function ($) {

  $.fn.mousehold = function (timeout, f) {
    if (timeout && typeof timeout == 'function') {
      f = timeout;
      timeout = 100;
    }
    if (f && typeof f == 'function') {
      let timer = 0;
      let fireStep = 0;
      return this.each(function () {
        $(this).mousedown(function () {
          fireStep = 1;
          let ctr = 0;
          const t = this;
          timer = setInterval(function () {
            ctr++;
            f.call(t, ctr);
            fireStep = 2;
          }, timeout);
        })

        const clearMousehold = function () {
          clearInterval(timer);
          if (fireStep == 1) f.call(this, 1);
          fireStep = 0;
        }

        $(this).mouseout(clearMousehold);
        $(this).mouseup(clearMousehold);
      })
    }
  }

})($);