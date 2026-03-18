(function () {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.__OVO_IDB_STORAGE_BRIDGE__) {
    return;
  }

  window.__OVO_IDB_STORAGE_BRIDGE__ = true;

  if (!window.indexedDB || !window.localStorage || !window.Storage) {
    console.warn('[StorageBridge] IndexedDB not available, using native localStorage only.');
    return;
  }

  var DB_NAME = 'ovo_unified_storage_db';
  var DB_VERSION = 1;
  var STORE_NAME = 'kv_storage';

  var nativeGetItem = Storage.prototype.getItem;
  var nativeSetItem = Storage.prototype.setItem;
  var nativeRemoveItem = Storage.prototype.removeItem;
  var nativeClear = Storage.prototype.clear;
  var nativeKey = Storage.prototype.key;

  var cache = new Map();
  var pendingOps = [];
  var flushTimer = null;
  var flushing = false;
  var bridgeReady = false;

  var dbPromise = null;
  var readyPromise = null;

  function normalizeKey(key) {
    return String(key);
  }

  function normalizeValue(value) {
    return String(value);
  }

  function isLocalStorageTarget(target) {
    try {
      return target === window.localStorage;
    } catch (e) {
      return false;
    }
  }

  function openDatabase() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        dbPromise = null;
        reject(request.error || new Error('open indexeddb failed'));
      };

      request.onblocked = function () {
        dbPromise = null;
        reject(new Error('open indexeddb blocked'));
      };
    });

    return dbPromise;
  }

  function readAllFromIndexedDB(db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var request = store.getAll();

      request.onsuccess = function () {
        resolve(Array.isArray(request.result) ? request.result : []);
      };

      request.onerror = function () {
        reject(request.error || new Error('read indexeddb failed'));
      };
    });
  }

  function applyOpsBatch(db, ops) {
    if (!ops || ops.length === 0) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);

      ops.forEach(function (op) {
        if (!op || !op.type) {
          return;
        }

        if (op.type === 'set') {
          store.put({ key: op.key, value: op.value });
          return;
        }

        if (op.type === 'remove') {
          store.delete(op.key);
          return;
        }

        if (op.type === 'clear') {
          store.clear();
        }
      });

      tx.oncomplete = function () {
        resolve();
      };

      tx.onerror = function () {
        reject(tx.error || new Error('write indexeddb failed'));
      };

      tx.onabort = function () {
        reject(tx.error || new Error('write indexeddb aborted'));
      };
    });
  }

  function primeCacheFromNativeLocalStorage() {
    try {
      var len = window.localStorage.length;
      for (var i = 0; i < len; i += 1) {
        var key = nativeKey.call(window.localStorage, i);
        if (!key) {
          continue;
        }

        var value = nativeGetItem.call(window.localStorage, key);
        if (value !== null) {
          cache.set(key, value);
        }
      }
    } catch (e) {
      console.warn('[StorageBridge] prime cache failed:', e);
    }
  }

  function scheduleFlush() {
    if (flushTimer) {
      return;
    }

    flushTimer = setTimeout(function () {
      flushTimer = null;
      flushPendingOps();
    }, 80);
  }

  function enqueueOp(op) {
    pendingOps.push(op);
    scheduleFlush();
  }

  function flushPendingOps() {
    if (flushing || pendingOps.length === 0) {
      return;
    }

    flushing = true;
    var ops = pendingOps.splice(0, pendingOps.length);

    openDatabase()
      .then(function (db) {
        return applyOpsBatch(db, ops);
      })
      .catch(function (error) {
        console.warn('[StorageBridge] flush failed:', error);
      })
      .finally(function () {
        flushing = false;
        if (pendingOps.length > 0) {
          scheduleFlush();
        }
      });
  }

  function publishReadyEvent() {
    try {
      window.dispatchEvent(new CustomEvent('indexeddb-storage-ready', {
        detail: {
          keyCount: cache.size
        }
      }));
    } catch (e) {
      // ignore
    }
  }

  function installLocalStorageHooks() {
    Storage.prototype.getItem = function (key) {
      if (isLocalStorageTarget(this)) {
        var normalizedKey = normalizeKey(key);
        if (cache.has(normalizedKey)) {
          return cache.get(normalizedKey);
        }

        var nativeValue = nativeGetItem.call(this, normalizedKey);
        if (nativeValue !== null) {
          cache.set(normalizedKey, nativeValue);
        }
        return nativeValue;
      }

      return nativeGetItem.call(this, key);
    };

    Storage.prototype.setItem = function (key, value) {
      if (isLocalStorageTarget(this)) {
        var normalizedKey = normalizeKey(key);
        var normalizedValue = normalizeValue(value);

        cache.set(normalizedKey, normalizedValue);
        enqueueOp({ type: 'set', key: normalizedKey, value: normalizedValue });

        // Keep a native mirror for compatibility with length/key semantics and third-party code.
        try {
          nativeSetItem.call(this, normalizedKey, normalizedValue);
        } catch (e) {
          console.warn('[StorageBridge] native mirror setItem failed:', e);
        }
        return;
      }

      return nativeSetItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function (key) {
      if (isLocalStorageTarget(this)) {
        var normalizedKey = normalizeKey(key);

        cache.delete(normalizedKey);
        enqueueOp({ type: 'remove', key: normalizedKey });

        try {
          nativeRemoveItem.call(this, normalizedKey);
        } catch (e) {
          console.warn('[StorageBridge] native mirror removeItem failed:', e);
        }
        return;
      }

      return nativeRemoveItem.call(this, key);
    };

    Storage.prototype.clear = function () {
      if (isLocalStorageTarget(this)) {
        cache.clear();
        enqueueOp({ type: 'clear' });

        try {
          nativeClear.call(this);
        } catch (e) {
          console.warn('[StorageBridge] native mirror clear failed:', e);
        }
        return;
      }

      return nativeClear.call(this);
    };

    Storage.prototype.key = function (index) {
      if (isLocalStorageTarget(this)) {
        var i = Number(index);
        if (!Number.isFinite(i) || i < 0) {
          return null;
        }
        var keys = Array.from(cache.keys());
        return keys[i] || null;
      }

      return nativeKey.call(this, index);
    };
  }

  function bootstrap() {
    primeCacheFromNativeLocalStorage();

    readyPromise = openDatabase()
      .then(function (db) {
        return readAllFromIndexedDB(db)
          .then(function (rows) {
            var idbMap = new Map();
            var migrationOps = [];

            rows.forEach(function (row) {
              if (!row || typeof row.key !== 'string') {
                return;
              }

              var rowValue = row.value === undefined || row.value === null ? null : String(row.value);
              idbMap.set(row.key, rowValue);

              if (cache.has(row.key)) {
                var localValue = cache.get(row.key);
                if (localValue !== rowValue) {
                  migrationOps.push({ type: 'set', key: row.key, value: localValue });
                }
                return;
              }

              if (rowValue !== null) {
                cache.set(row.key, rowValue);
                try {
                  nativeSetItem.call(window.localStorage, row.key, rowValue);
                } catch (e) {
                  // ignore mirror sync errors
                }
              }
            });

            cache.forEach(function (value, key) {
              if (!idbMap.has(key)) {
                migrationOps.push({ type: 'set', key: key, value: value });
              }
            });

            if (migrationOps.length > 0) {
              return applyOpsBatch(db, migrationOps);
            }

            return Promise.resolve();
          });
      })
      .catch(function (error) {
        console.warn('[StorageBridge] bootstrap fallback to native localStorage:', error);
      })
      .finally(function () {
        bridgeReady = true;
        publishReadyEvent();
        flushPendingOps();
      });

    return readyPromise;
  }

  installLocalStorageHooks();
  bootstrap();

  window.IndexedDBStorageBridge = {
    ready: function () {
      return readyPromise || Promise.resolve();
    },
    isReady: function () {
      return bridgeReady;
    },
    getItem: function (key) {
      var normalizedKey = normalizeKey(key);
      return cache.has(normalizedKey) ? cache.get(normalizedKey) : null;
    },
    setItem: function (key, value) {
      window.localStorage.setItem(key, value);
    },
    removeItem: function (key) {
      window.localStorage.removeItem(key);
    },
    clear: function () {
      window.localStorage.clear();
    },
    flush: function () {
      flushPendingOps();
    }
  };
})();
