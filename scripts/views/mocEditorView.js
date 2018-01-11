
(function (module) {
  mocEditorView = {};
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
          // newEventView.render();
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
    var $form = $(this).parents('form');
    var $list = $('#current-pending');
    $('.to-remove').remove();
    $('#submit-success').addClass('hidden');
    var compiledTemplate = Handlebars.getTemplate('newMOC');
    $list.empty();
    var $errorMessage = $('.new-event-form #member-help-block');
    var $memberformgroup = $('#member-form-group');
    if (validateMember(member)) {
      $('#member-form-group').removeClass('has-error');
      var memberKey = Moc.getMemberKey(member);
      var memberid = Moc.allMocsObjs[memberKey].id;
      firebasedb.ref('mocData/' + memberid).once('value').then(function (snapshot) {
        if (snapshot.exists()) {
          var mocdata = snapshot.val();
          Moc.currentMoc = new Moc(mocdata);
          $('#moc-editor-form').append(compiledTemplate(mocdata));

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
    if (value === 'true') { value = true }
    if (value === 'false') { value = false }
    $input.val(value);
    Moc.currentMoc[$input.attr('id')] = value;
  };

  updateMember = function (event) {
    event.preventDefault();
    var $input = $(this);
    var value = $(this).val();
    Moc.currentMoc[$input.attr('id')] = value;
  };

  updateDisplayName = function (event) {
    var $input = $(this);
    $input.addClass('changed')
  };

  saveMOC = function (event) {
    event.preventDefault();
    if ($('#displayName').hasClass('changed')) {
      mocID = new Moc({
        nameEntered: $('#displayName').val(),
        id: Moc.currentMoc.govtrack_id
      });
      mocID.updateDisplayName();
    }

    moc = Moc.currentMoc;
    moc.updateFB().then(function(){
      $('.to-remove').remove();
      $('#update-successful').text(`Update of ${Moc.currentMoc.displayName} successful!`);
    });
  };

  $('#moc-editor-form').on('change', '#member-lookup', lookupMember);
  $('#moc-editor-form').on('change', '.moc-input', updateMember);
  $('#moc-editor-form').on('change', '#displayName', updateDisplayName);
  $('#moc-editor-form').on('click', '.member-info a', changeDropdown);
  $('#moc-editor-form').on('submit', saveMOC);

  module.mocEditorView = mocEditorView;
})(window);
