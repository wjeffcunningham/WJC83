jQuery(document).ready(function ($) {
    // call the function to add thumbnails in the placeholder divs    
    ytLazy();

    /**
     * @function        ytLazy
     * Description:     grabs youtube embed placeholder divs and adds in a clickable thumbnail
     *                  make the thumbnail switch to the embedded video on click to delay 
     *                  the loading of a bunch of youtube scripts until they're used
     * @see             blue-star/inc/image-sizes.php
     * @see             blue-star/js/publish.js
     * @see             blue-star/js/pubsub.js
     * 
     */
    function ytLazy() {
        // get all yt-embed divs
        var embed = document.getElementsByClassName("yt-embed");

        // walk through all of those divs and add in the youtube iframe
        for (var i = 0; i < embed.length; i++) {
            // assign variables
            var iframe = document.createElement("iframe");
            var ytStart = embed[i].dataset.start;
            var ytID = embed[i].dataset.id;
            var ytTitle = embed[i].dataset.title;

            if (ytStart != "") {
                ytStart = "&start=" + ytStart;
            }

            var imgsrc = 'https://i.ytimg.com/vi/' + ytID + '/maxresdefault.jpg';
            var src = 'https://www.youtube.com/embed/' + ytID + '?autoplay=1' + ytStart;
            var srcset = `srcset="https://i.ytimg.com/vi/` + ytID + `/maxresdefault.jpg 1280w, https://i.ytimg.com/vi/` + ytID + `/sddefault.jpg 640w, https://i.ytimg.com/vi/` + ytID + `/hqdefault.jpg 480w, https://i.ytimg.com/vi/` + ytID + `/mqdefault.jpg 320w"`;
            var sizes = 'sizes="(max-width: 321px) 320px, (max-width: 481px) 480px, (max-width: 641px) 640px, 700px"';
            var srcdoc = `<style>*
                {padding:0;margin:0;overflow:hidden}
                html,body{height:100%}
                img,span{position:absolute;width:100.1%;top:0;bottom:0;margin:auto}
                span{height:1.5em;text-align:center;font:60px/1.5 sans-serif;color:white;text-shadow:.05em .05em .3em black}
                </style>
                <a href="` + src + `">
                <img src="` + imgsrc + `" alt='` + ytTitle + `' loading="lazy" ` + srcset + ` ` + sizes + `>
                <span>▶</span>
                </a>`;

            // set attributes for iframe
            iframe.setAttribute("src", src);
            iframe.setAttribute("srcdoc", srcdoc);
            iframe.setAttribute("frameborder", "0");
            iframe.setAttribute("allowfullscreen", "1");
            iframe.setAttribute("width", "640");
            iframe.setAttribute("height", "360");
            iframe.setAttribute("class", "yt-loaded");
            iframe.setAttribute("loading", "lazy");
            iframe.setAttribute("title", ytTitle);
            iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
            embed[i].appendChild(iframe);
        }

        // var "embed" is loaded full of div elements with class "yt-embed"
        // when you change the class the dom element is removed from var "embed" on the fly
        // to avoid this script from re-adding every iframe when ajax load more completes
        // we walk backwards through all of them that we just finished and change the class name
        // we go backwards because each one will be removed from the list when the class is changed
        for (var j = embed.length - 1; j >= 0; j--) {
            embed[j].setAttribute("class", "yt-loaded");
        }
    }
});