/**
 * Re-initialize theme behavior after shared components are injected.
 * Load after main.js on pages that use components (data-page-id on body).
 */
(function ($) {
    'use strict';
    $(document).on('componentsLoaded', function () {
        if ($('#mobile-menu').length && !$('#mobile-menu').parent().hasClass('mean-nav')) {
            $('#mobile-menu').meanmenu({
                meanMenuContainer: '.mobile-menu',
                meanScreenWidth: '991',
                meanExpand: ['<i class="far fa-plus"></i>']
            });
        }
        $(window).trigger('scroll');
    });
})(window.jQuery);
