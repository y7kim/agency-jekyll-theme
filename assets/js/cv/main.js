


$(document).ready(function() {

    $('html').addClass('js-enabled');

    setup_nivo_lightbox();
    setup_dense();

    $(window).load(function() {
        $(".js-preloader").fadeOut(800, function() {
            $(".js-main-container").fadeIn(800);

            setup_scrollreveal();
            setup_progress_bar_animation();
        });
    });

});



function setup_progress_bar_animation()
{
    var $animation_elements = $("[class*='a-']");
    var $window = $(window);

    $window.on('scroll resize', function() {
        var window_height = $window.height();
        var window_top_position = $window.scrollTop();
        var window_bottom_position = (window_top_position + window_height);

        $.each($animation_elements, function() {
            var $element = $(this);
            var element_height = $element.outerHeight();
            var element_top_position = $element.offset().top;
            var element_bottom_position = (element_top_position + element_height);

            // Check to see if this current container is within viewport
            if ((element_bottom_position >= window_top_position) &&
                (element_top_position <= window_bottom_position)) {
                $element.addClass('in-view');

                // Animate progress bar
                if ($element.hasClass('a-progress-bar')) {
                    $element.css('width', $element.attr('data-percent') + '%');
                }

            }
            //else {
            //    $element.removeClass('in-view');
            //}
        });
    });

    $window.trigger('scroll');

}



function setup_dense()
{
    if($.isFunction($.fn.dense)) {

        $('img').dense({
            'glue': '@'
        });

    }
}



function setup_scrollreveal()
{
    if(typeof ScrollReveal !== 'undefined' && $.isFunction(ScrollReveal)) {

        window.sr = ScrollReveal();

        var default_config = {
            duration: 500,
            delay: 0,
            easing: 'ease',
            scale: 1,
            mobile: false
        };
        var header_config = $.extend(false, default_config, {
            duration: 1200,
            delay: 700
        });
        var footer_config = $.extend(false, default_config, {
            duration: 1500,
            distance: 0,
            viewOffset: {top: 0, right: 0, bottom: 100, left: 0}
        });

        var default_delay = 175;

        sr.reveal('.a-header', header_config, default_delay);
        sr.reveal('.a-footer', footer_config, default_delay);

    }

}



function setup_nivo_lightbox()
{
    if($.isFunction($.fn.nivoLightbox))
    {
        var $selector = $('.js-lightbox');

        // Hide all titles to prevent tooltip from showing
        $selector.each(function() {
            var title = $(this).attr('title');
            $(this).attr('data-title', title);
            $(this).attr('title', '');
        });

        // On click, add titles back, so lightbox can display them
        $selector.click(function() {
            $selector.each(function() {
                var title = $(this).attr('data-title');
                $(this).attr('title', title);
            });
        });

        $selector.nivoLightbox({
            effect: 'fade',                               // The effect to use when showing the lightbox
            theme: 'default',                             // The lightbox theme to use
            keyboardNav: true,                            // Enable/Disable keyboard navigation (left/right/escape)
            clickOverlayToClose: true,                    // If false clicking the "close" button will be the only way to close the lightbox
            onInit: function(){},                         // Callback when lightbox has loaded
            beforeShowLightbox: function(){},             // Callback before the lightbox is shown
            afterShowLightbox: function(lightbox){},      // Callback after the lightbox is shown
            beforeHideLightbox: function(){},             // Callback before the lightbox is hidden
            //afterHideLightbox: function(){},              // Callback after the lightbox is hidden
            onPrev: function(element){},                  // Callback when the lightbox gallery goes to previous item
            onNext: function(element){},                  // Callback when the lightbox gallery goes to next item
            afterHideLightbox: function() {
                // Remove title to prevent tooltip from showing
                $selector.attr('title', '');
            },
            errorMessage: 'The requested content cannot be loaded. Please try again later.' // Error message when content can't be loaded
        });

    }
}