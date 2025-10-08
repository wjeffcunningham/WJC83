jQuery(document).ready(function(event) {

    jQuery('body').on('mouseover', '.card-popup', function() {

        jQuery(this).qtip({
            content: {
                attr: 'data-tooltip'
            },
            style: {
                classes: "qtip-light qtip-rounded"
            },
            overwrite: true, // Overwrite tooltips already bound, or only displays once
            show: {
                event: event.type, // Use the same event type as above
                ready: true // Show immediately - important!
            }
        })
    });
});