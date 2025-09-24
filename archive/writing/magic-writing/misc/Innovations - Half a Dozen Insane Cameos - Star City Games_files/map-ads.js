window.googletag = window.googletag || { cmd: [] };
googletag.cmd.push(function () {
    var sizeMapping = googletag.sizeMapping()
        .addSize([1119, 300], [970, 90])
        .addSize([792, 200], [728, 90])
        .addSize([508, 150], [468, 60])
        .addSize([327, 100], [300, 100])
        .addSize([0, 0], [])
        .build();

    googletag.defineSlot('/22127697132/articles_site/articles_side_footer', [[300, 100], [728, 90], [970, 90], [468, 60]], 'ad-side-footer')
        .defineSizeMapping(sizeMapping).setForceSafeFrame(true).addService(googletag.pubads());
    googletag.defineSlot('/22127697132/articles_site/articles_site_sidebar', [336, 280], 'div-gpt-ad-1604511604592-0').addService(googletag.pubads());

    interimSizeMapping = googletag.sizeMapping()
        .addSize([945, 300], [])
        .addSize([508, 150], [468, 60])
        .addSize([327, 100], [300, 100])
        .addSize([0, 0], [])
        .build();

    googletag.defineSlot('/22127697132/articles_site/articles_site_3rd_4th_article', [[468, 60], [728, 90], [300, 100]], 'ad-interim-1')
        .defineSizeMapping(interimSizeMapping).setForceSafeFrame(true).addService(googletag.pubads());
    googletag.defineSlot('/22127697132/articles_site/articles_site_7th_8th_article', [[468, 60], [728, 90], [300, 100]], 'ad-interim-2')
        .defineSizeMapping(interimSizeMapping).setForceSafeFrame(true).addService(googletag.pubads());

    googletag.pubads().enableSingleRequest();
    googletag.enableServices();
});