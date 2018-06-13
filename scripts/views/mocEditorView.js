/*globals firebasedb*/

(function (module) {
  var mocEditorView = {};
  function setupTypeaheads(input) {
    var typeaheadConfig = {
      fitToElement: true,
      delay: 200,
      highlighter: function(item) { return item; }, // Kill ugly highlight
      filter: function(selection) {
        $(input).val(selection);
      },
    };
    Moc.loadAllByName().then(function(allnames){
      Moc.allNames = allnames;
      $(input).typeahead($.extend({source: allnames}, typeaheadConfig));
          // newEventView.render();
    });
  }
  setupTypeaheads('.member-lookup');

  function validateMember(member) {
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
  }

  function lookupMember() {
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
      var memberid = Moc.allMocsObjsByName[memberKey].id;
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
  }

  function changeDropdown(event) {
    event.preventDefault();
    var $input = $(this).parents('.input-group').find('input');
    var value = $(this).attr('data-value');
    if (value === 'true') { value = true; }
    if (value === 'false') { value = false; }
    $input.val(value);
    Moc.currentMoc[$input.attr('id')] = value;
  }

  function convertToBool(prop){
    var value = prop.toLowerCase(); 
    if (value === 'true') { return value = true; }
    else if (value === 'false') { return value = false; }
    else { return prop; }
  }

  mocEditorView.uploadCSV = function(files){
    if(window.FileReader){
      var reader = new FileReader();
      reader.readAsText(files[0]);
      reader.onload = csvReader;
      reader.onerror = errorHandler;
    }else {
      alert('This feature is not supported in your browser!');
    }
  };

  function csvReader(event){
    var csv = event.target.result;
    processData(csv);
  }

  function createHeaders(headers){
    return headers.map(function (heading) {
      return heading.toLowerCase() !== 'missingmember' && heading.toLowerCase() !== 'missing member' ? heading.replace(/[^A-Z0-9]+/ig, '_').toLowerCase() : 'missingMember';
    });
  }

  function createNewMoc(member, headers){
    var newMember = {};
    member.reduce(function (accumulator, currentValue, currentIndex) {
      return newMember[headers[currentIndex]] = convertToBool(currentValue);
    }, {});
    var moc = new Moc(newMember);
    moc['id'] = moc['govtrack_id'];
    return moc;
  }

  function createReportLi(content){
    var $report = $('#upload-report')[0];
    var li = document.createElement('li');
    li.innerHTML = content;
    $report.appendChild(li);
  }
  
  function clearReport(event){
    event.preventDefault();
    $('#upload-report').empty();
    $('#clear-report').remove();
    $('#upload-message').empty();
  }

  function processData(csv){
    var allTextLines = csv.split(/\r\n|\n/);
    var lines = [];
    for (var i = 0; i < allTextLines.length; i++) {
      var data = allTextLines[i].split(',');
      var tarr = [];
      for (var j = 0; j < data.length; j++) {
        tarr.push(data[j]);
      }
      lines.push(tarr);
    }
    var headers = createHeaders(lines.shift());

    lines.map(function(member){
      if(member[0] !== ''){
        var memberName = `${member[0]} ${member[1]}`;
        var memberKey = Moc.getMemberKey(memberName);
        if (!Moc.allMocsObjsByName[memberKey]){
          var govtrackIndex = headers.indexOf('govtrack_id');
          if(govtrackIndex > -1 && member[govtrackIndex]){
            var moc = createNewMoc(member,headers);
            moc.updateFB().then(function () {
              createReportLi(`${member[0]} ${member[1]} added`);
            });
          } else {
            createReportLi(`No govtrack_id for ${member[0]} ${member[1]}, they were not added to the database`);
          }   
        } else {
          var memberid = Moc.allMocsObjsByName[memberKey].id;
          firebasedb.ref('mocData/' + memberid).once('value').then(function (snapshot) {
            if (snapshot.exists()) {
              var mocdata = snapshot.val();
              Moc.currentMoc = new Moc(mocdata);
              for (var i = 1; i < headers.length; i++) {
                if (member[i]) {
                  Moc.currentMoc[headers[i]] = convertToBool(member[i]);
                }
              }
              Moc.currentMoc.updateFB().then(function () {
                createReportLi(`Updated ${member[0]} ${member[1]}`);
              });
            } else {
              console.log('No user by that name');
            }
          })
            .catch(function (error) {
              console.error(error);
            });
        }
      }});
    var clearButton = document.createElement('button');
    clearButton.innerHTML = 'Clear report';
    clearButton.setAttribute('id','clear-report');
    clearButton.setAttribute('style', 'display:block');

    $('#moc-uploads')[0].reset();
    $('#upload-message')[0].innerHTML = 'Upload complete';
    $('#upload-message')[0].append(clearButton);
    $('#clear-report').on('click', clearReport);
  }

  function errorHandler(evt) {
    if (evt.target.error.name == 'NotReadableError') {
      $('#upload-message')[0].innerHTML = 'Unable to read the file!';
    }
  }

  function updateMember(event) {
    event.preventDefault();
    var $input = $(this);
    var value = $(this).val();
    Moc.currentMoc[$input.attr('id')] = value;
  }

  function updateDisplayName() {
    var $input = $(this);
    $input.addClass('changed');
  }

  function saveMOC(event) {
    event.preventDefault();
    if ($('#displayName').hasClass('changed')) {
      var mocID = new Moc({
        nameEntered: $('#displayName').val(),
        id: Moc.currentMoc.govtrack_id,
      });
      mocID.updateDisplayName();
    }

    var moc = Moc.currentMoc;
    moc.updateFB().then(function(){
      $('.to-remove').remove();
      $('#update-successful').text(`Update of ${Moc.currentMoc.displayName} successful!`);
    });
  }

  $('#moc-editor-form').on('change', '#member-lookup', lookupMember);
  $('#moc-editor-form').on('change', '.moc-input', updateMember);
  $('#moc-editor-form').on('change', '#displayName', updateDisplayName);
  $('#moc-editor-form').on('click', '.member-info a', changeDropdown);
  $('#moc-editor-form').on('submit', saveMOC);

  module.mocEditorView = mocEditorView;
})(window);
