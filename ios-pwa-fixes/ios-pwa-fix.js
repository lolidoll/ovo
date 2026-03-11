(function () {
    'use strict';

    if (window.__IOS_PWA_FULLSCREEN_FIX__) {
        return;
    }
    window.__IOS_PWA_FULLSCREEN_FIX__ = true;

    var root = document.documentElement;
    var state = {
        rafId: 0,
        baseInnerHeight: window.innerHeight || 0
    };

    function isIOS() {
        var ua = navigator.userAgent || '';
        return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    }

    function isStandalone() {
        var mediaStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
        var mediaFullscreen = window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;
        var iosStandalone = window.navigator.standalone === true;
        return Boolean(mediaStandalone || mediaFullscreen || iosStandalone);
    }

    function isEditableElement(element) {
        if (!element) {
            return false;
        }

        if (element.isContentEditable) {
            return true;
        }

        var tagName = (element.tagName || '').toLowerCase();
        if (tagName === 'textarea') {
            return true;
        }

        if (tagName !== 'input') {
            return false;
        }

        var blocked = {
            button: true,
            checkbox: true,
            color: true,
            file: true,
            hidden: true,
            radio: true,
            range: true,
            reset: true,
            submit: true
        };

        var inputType = (element.type || 'text').toLowerCase();
        return !blocked[inputType];
    }

    function updateModeClasses() {
        var ios = isIOS();
        var standalone = isStandalone();

        root.classList.toggle('is-ios', ios);
        root.classList.toggle('is-pwa', standalone);
        root.classList.toggle('is-standalone', standalone);
        root.classList.toggle('ios-standalone', ios && standalone);
    }

    function updateViewportVariables() {
        var visualViewport = window.visualViewport;
        var innerHeight = window.innerHeight || root.clientHeight || 0;
        var innerWidth = window.innerWidth || root.clientWidth || 0;
        var visualHeight = visualViewport ? visualViewport.height : innerHeight;
        var visualTop = visualViewport ? (visualViewport.offsetTop || 0) : 0;

        var viewportHeight = Math.max(320, Math.round(visualHeight || innerHeight || 0));
        state.baseInnerHeight = Math.max(state.baseInnerHeight, innerHeight);

        var keyboardHeight = visualViewport
            ? Math.max(0, Math.round(innerHeight - visualHeight - visualTop))
            : Math.max(0, Math.round(state.baseInnerHeight - innerHeight));

        var keyboardOpen = isEditableElement(document.activeElement) && keyboardHeight > 90;
        var vh = viewportHeight * 0.01;

        root.style.setProperty('--vh', vh + 'px');
        root.style.setProperty('--app-height', viewportHeight + 'px');
        root.style.setProperty('--dynamic-app-height', viewportHeight + 'px');
        root.style.setProperty('--window-height', Math.round(innerHeight) + 'px');
        root.style.setProperty('--viewport-width', Math.max(320, Math.round(innerWidth || 0)) + 'px');
        root.style.setProperty('--visual-viewport-height', Math.round(visualHeight || innerHeight || 0) + 'px');
        root.style.setProperty('--keyboard-height', keyboardOpen ? keyboardHeight + 'px' : '0px');

        root.classList.toggle('keyboard-open', keyboardOpen);
        if (document.body) {
            document.body.classList.toggle('keyboard-open', keyboardOpen);
        }
    }

    function refresh() {
        state.rafId = 0;
        updateModeClasses();
        updateViewportVariables();
    }

    function scheduleRefresh() {
        if (state.rafId) {
            return;
        }
        state.rafId = window.requestAnimationFrame(refresh);
    }

    function scheduleRefreshDelayed(delayMs) {
        window.setTimeout(scheduleRefresh, delayMs);
    }

    function bindDisplayModeListeners() {
        if (!window.matchMedia) {
            return;
        }

        var standaloneMedia = window.matchMedia('(display-mode: standalone)');
        var fullscreenMedia = window.matchMedia('(display-mode: fullscreen)');

        if (typeof standaloneMedia.addEventListener === 'function') {
            standaloneMedia.addEventListener('change', scheduleRefresh);
            fullscreenMedia.addEventListener('change', scheduleRefresh);
        } else if (typeof standaloneMedia.addListener === 'function') {
            standaloneMedia.addListener(scheduleRefresh);
            fullscreenMedia.addListener(scheduleRefresh);
        }
    }

    window.addEventListener('resize', scheduleRefresh, { passive: true });
    window.addEventListener('pageshow', scheduleRefresh, { passive: true });
    window.addEventListener('load', scheduleRefresh, { passive: true });
    window.addEventListener('orientationchange', function () {
        scheduleRefreshDelayed(180);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            scheduleRefreshDelayed(80);
        }
    });

    document.addEventListener('focusin', function (event) {
        if (isEditableElement(event.target)) {
            scheduleRefreshDelayed(120);
        }
    });

    document.addEventListener('focusout', function () {
        scheduleRefreshDelayed(80);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleRefresh, { passive: true });
        window.visualViewport.addEventListener('scroll', scheduleRefresh, { passive: true });
    }

    bindDisplayModeListeners();
    scheduleRefresh();

    window.IOSPWAFullscreenFix = {
        refresh: scheduleRefresh,
        isStandalone: isStandalone,
        isIOS: isIOS
    };
})();
