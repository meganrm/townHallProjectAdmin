
(function (module) {
  mocReportView = {};

  mocReportView.drawTable = function(member) {
    var compiledTemplate = Handlebars.getTemplate('mocReport');
    if (member.lastUpdated === 'Never') {
      $('#moc-report-not-updated').append(compiledTemplate(member));
    } else {
      $('#moc-report-updated').append(compiledTemplate(member));
    }
  };

  Moc.loadAllUpdated().then(function(returned){
    returned.forEach(function(member){
      mocReportView.drawTable(member);
    });
  });

  firebase.database().ref('mocData/').on('child_changed', function(snapshot){
    var memberobj = snapshot.val();
    var name = memberobj.ballotpedia_id ? memberobj.ballotpedia_id: memberobj.first_name + ' ' + memberobj.last_name;
    var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
    $('#' + memberobj.govtrack_id).remove();
    var member = {
      id: memberobj.govtrack_id,
      name: name,
      chamber : memberobj.type,
      lastUpdated : lastUpdated
    };
    mocReportView.drawTable(member);
  });

  module.mocReportView = mocReportView;
})(window);
