/*globals adminSiteController */

function routes(location){
  switch (location) {
  case '#moc-update':
    adminSiteController.initMOCReport();
    break;
  default:

  }
}

$('nav').on('click', '.hash-link', function onClickGethref() {
  var hashid = this.getAttribute('href');
  if (hashid === '#home') {
    history.replaceState({}, document.title, '.');
  } else {
    location.hash = hashid;
  }
  routes(hashid);
});
