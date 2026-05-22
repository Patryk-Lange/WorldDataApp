/* ============================================================
   World Data Explorer – eventbus.js
   Simple publish/subscribe for decoupled module communication.
   ============================================================ */
'use strict';

const EventBus = (function () {
  const listeners = {};

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(f => f !== fn);
  }

  function emit(event, payload) {
    (listeners[event] || []).forEach(fn => {
      try { fn(payload); } catch (e) { console.error('[EventBus]', event, e); }
    });
  }

  return { on, off, emit };
})();

/*
  Canonical events:
    countrySelected   { a3, numericId }
    countryDeselected {}
    modeChanged       { id }        ← indicator id
    groupFiltered     { groupName } ← supranational / region filter
    groupCleared      {}
    zoomChanged       { k, x, y }
    comparisonAdded   { a3 }
    comparisonRemoved { a3 }
    comparisonCleared {}
    bookmarksChanged  { bookmarks }  ← Set of A3 codes
*/
