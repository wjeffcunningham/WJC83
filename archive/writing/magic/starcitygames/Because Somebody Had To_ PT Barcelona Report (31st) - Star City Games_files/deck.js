jQuery(document).ready(function($) {
    //Since the Ajax Load More plugin doesn't reference the article ID that WILL be loaded,
    //just the article it was loaded FROM, we gotta redo them all every time
    //Fortunately, it's low overhead

    activateDecks();

    function activateDecks() {

        const articles = $('article');

        articles.each(function() {
            const decks = $(this).find(".deck_card_wrapper");

            decks.each(function() {
                activateDeck($(this));
            });
        });
    }

    function activateDeck(deck) {
        const image_preview = deck.find('img:first');
        const cardLinks = deck.find(".card-link");

        cardLinks.each(function () {

            //Unload all the prior mouseovers to ensure we're not adding memory leaks
            $(this).off('mouseover');

            $(this).on('mouseover', function () {
                image_preview.attr('src', $(this).attr('data-image-url'));
                image_preview.attr('alt', $(this).attr('data-image-alt'));
            });
        });
    }
});

function arenaExport(deck) {
    let decklist = '';
    let main = deck.Maindeck;
    let sideboard = null;
    if(deck.hasOwnProperty('Sideboard')) {
        sideboard = deck.Sideboard;
    }

    for (let line of main) {
        decklist += line + "\n";
    }

    decklist += "\n";

    if (typeof sideboard === 'object' && sideboard !== null) {
        for (let line of sideboard) {
            decklist += line + "\n";
        }
    }

    let button = '<button onclick=\'document.getElementById("decklist").select(); document.execCommand("copy");\'>Copy to Clipboard</button>';

    let popup = window.open('', '_blank', 'width=500,height=500');
    popup.document.write('<textarea readonly rows="25" cols="51" id="decklist">' + decklist + '</textarea>' + button);
    popup.document.close();
}