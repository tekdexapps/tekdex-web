/**
 * Load shared theme components (header, footer, preloader, offcanvas, search)
 * into placeholder elements. Set data-page-id on body for active nav highlight.
 * Requires: jQuery. Load this script on pages that use component placeholders.
 */
(function () {
    'use strict';

    var BASE = typeof window.PAGE_BASE !== 'undefined' ? window.PAGE_BASE : '';
    var components = [
        { id: 'preloader-container', url: 'components/preloader.html' },
        { id: 'offcanvas-container', url: 'components/offcanvas.html' },
        { id: 'header-container', url: 'components/header.html' },
        { id: 'search-container', url: 'components/search.html' },
        { id: 'footer-container', url: 'components/footer.html' }
    ];

    function setActiveNav() {
        var pageId = document.body.getAttribute('data-page-id');
        if (!pageId) return;
        var nav = document.querySelector('#header-container nav a[href*="' + pageId + '"]');
        if (!nav) return;
        var list = nav.closest('li');
        if (!list) return;
        document.querySelectorAll('#header-container nav ul li').forEach(function (li) {
            li.classList.remove('active');
        });
        list.classList.add('active');
    }

    function injectOne(selector, html) {
        var el = document.getElementById(selector);
        if (el && html) {
            el.innerHTML = html;
        }
    }

    function loadAll(done) {
        var pending = components.length;
        var results = {};
        function check() {
            pending--;
            if (pending === 0 && typeof done === 'function') {
                done(results);
            }
        }
        components.forEach(function (c) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', BASE + c.url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    results[c.id] = xhr.status === 200 ? xhr.responseText : '';
                    injectOne(c.id, results[c.id]);
                    check();
                }
            };
            xhr.send();
        });
    }

    loadAll(function () {
        setActiveNav();
        if (typeof window.jQuery !== 'undefined') {
            window.jQuery(document).trigger('componentsLoaded');
        }
    });
})();
