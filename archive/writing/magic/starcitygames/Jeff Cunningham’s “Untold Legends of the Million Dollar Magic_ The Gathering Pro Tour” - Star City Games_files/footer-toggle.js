jQuery(function($){
    $('li.open-menu').children('ul.sub-menu').first().slideToggle();
    
    $('#footer-menu > li.menu-item-has-children > a').click(function(event){
        event.preventDefault();

        var queryMedium = 1024;
        if($(window).width()<= queryMedium){
            $(this).parent('li').toggleClass("open-menu").children('ul.sub-menu').first().slideToggle();
        }
    });
});


