/*!
 * Start Bootstrap - Agency Bootstrap Theme (http://startbootstrap.com)
 * Code licensed under the Apache License v2.0.
 * For details, see http://www.apache.org/licenses/LICENSE-2.0.
 */

$(document).ready(function() {
    // jQuery for page scrolling feature - requires jQuery Easing plugin
    $('a.page-scroll').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1500, 'easeInOutExpo');
        event.preventDefault();
    });

    // Highlight the top nav as scrolling occurs
    $('body').scrollspy({
        target: '.navbar-fixed-top'
    });

    // Closes the Responsive Menu on Menu Item Click
    $('.navbar-collapse ul li a').click(function() {
        $('.navbar-toggle:visible').click();
    });

    // Handle the modal hash in URL when a modal is opened
    $('div.modal').on('show.bs.modal', function() {
        var modal = this;
        var hash = modal.id;
        window.location.hash = hash;
        window.onhashchange = function() {
            if (!location.hash) {
                $(modal).modal('hide');
            }
        };
    });

    // Clear the URL hash when the modal is closed
    $('div.modal').on('hidden.bs.modal', function() {
        history.pushState("", document.title, window.location.pathname + window.location.search);
        console.log('Modal closed and hash cleared');

        // Move focus to a different element to prevent aria-hidden issues
        setTimeout(function() {
            $('.navbar-brand').focus();  // Assuming moving focus to the navbar brand link
        }, 500);
    });
});

document.addEventListener("DOMContentLoaded", function () {
    [".vision-box", ".company-info-box"].forEach(function (selector) {
        let el = document.querySelector(selector);
        if (el) {
            new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("appear");
                        }
                    });
                },
                { threshold: 0.5 }
            ).observe(el);
        }
    });
});
