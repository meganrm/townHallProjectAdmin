
(function (module) {
  missingMemberPosterView = {};
  function setupTypeaheads(input) {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 200,
      highlighter: function(item) { return item; }, // Kill ugly highlight
      filter: function(selection) {
        $(input).val(selection);
      }
    };
    Moc.loadAll().then(function(allnames){
      Moc.allNames = allnames;
      $(input).typeahead($.extend({source: allnames}, typeaheadConfig));
    });
  }
  setupTypeaheads('.member-lookup');

  validateMember = function (member) {
    var $errorMessage = $('.new-event-form #member-help-block');
    var $memberformgroup = $('#member-form-group');
    if (member.length < 1) {
      $errorMessage.html('Please enter a member of congress name');
      $memberformgroup.addClass('has-error');
    } else if (parseInt(member)) {
      $errorMessage.html('Please enter a member of congress name');
      $memberformgroup.addClass('has-error');
    } else if (member.split(' ').length === 1) {
      $errorMessage.html('Please enter both a first and last name');
      $memberformgroup.addClass('has-error');
    } else {
      return true;
    }
  };

  lookupMember = function () {
    var $memberInput = $(this);
    var member = $memberInput.val();
    var $list = $('#current-pending');
    $('.to-remove').remove();
    $('#submit-success').addClass('hidden');
    var compiledTemplate = Handlebars.getTemplate('mocPoster');
    $list.empty();

    if (validateMember(member)) {
      $('#member-form-group').removeClass('has-error');
      var memberKey = Moc.getMemberKey(member);
      var memberid = Moc.allMocsObjs[memberKey].id;
      firebase.database().ref('mocData/' + memberid).once('value').then(function (snapshot) {
        if (snapshot.exists()) {
          var mocdata = snapshot.val();
          Moc.currentMoc = new Moc(mocdata);
          $('#missingMemberPosterModal').append(compiledTemplate(mocdata));

        } else {
          $('#member-form-group').addClass('has-error');
          $('.new-event-form #member-help-block').html('That member is not in our database, please check the spelling, and only use first and last name.');
        }
      })
      .catch(function (error) {
        console.error(error);
      });
    }
  };

  changeDropdown = function (event) {
    event.preventDefault();
    var $input = $(this).parents('.input-group').find('input');
    var value = $(this).attr('data-value');
    $input.val(value);
    Moc.currentMoc[$input.attr('id')] = value;
  };
  saveMOC = function (event) {
    event.preventDefault();
    moc = Moc.currentMoc;
    moc.updateFB();
  };

  $('#moc-editor-form').on('change', '#member-poster-lookup', lookupMember);
  $('#moc-editor-form').on('click', '.member-info a', changeDropdown);
  $('#moc-editor-form').on('submit', saveMOC);

  module.missingMemberPosterView = missingMemberPosterView;
})(window);
