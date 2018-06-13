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
    var boolFieldsTemplate = Handlebars.getTemplate('mocBoolField');
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
          Object.keys(mocdata).forEach(function(key){
            if(typeof mocdata[key] === 'boolean' && key !== 'in_office'){
              var boolField = {key: key, value: mocdata[key]};
              $('#new-fields').append(boolFieldsTemplate(boolField));
            }
          });
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

  ///I don't think this does anything, had to update the Moc.currentMoc object directly in saveMoc function
  function changeDropdown(event) {
    event.preventDefault();
    var $input = $(this).parents('.input-group').find('input');
    var value = $(this).attr('data-value');
    if (value === 'true') { value = true; }
    if (value === 'false') { value = false; }
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

    ///If value of key is string true or false, convert to bool
    Object.keys(Moc.currentMoc).forEach(key => {
      if (Moc.currentMoc[key] === 'true') { Moc.currentMoc[key] = true;}
      if (Moc.currentMoc[key] === 'false') { Moc.currentMoc[key] = false; }
    });

    var moc = Moc.currentMoc;
    moc.updateFB().then(function(){
      $('.to-remove').remove();
      $('#update-successful').text(`Update of ${Moc.currentMoc.displayName} successful!`);
    });
  }

  ///adds entry for a new field
  function addField(){
    $('#added-field').append($('<input>', { 
      type: 'text', 
      id:'field-lookup', 
      class: 'input-underline', 
      placeholder:'Field name', 
      value:'',
      autocomplete:'off' })).append($('<button>', {
        type: 'button',
        id: 'new-field',
        value: '',
      }).text('Create Field')).append($('<button>', {
        type: 'button',
        id: 'delete-field',
        value: 'delete',
      }).text('X'));
  }

  function updateButtonValue(){
    $('#new-field').val($('#field-lookup').val());
  }

  function newField(event){
    if(event.target.value){
      var databaseName = event.target.value.replace(/[^A-Z0-9]+/ig, '_');
      var boolFieldsTemplate = Handlebars.getTemplate('mocBoolField');
      var boolField = { key: databaseName, value: false };
      $('#new-fields').append(boolFieldsTemplate(boolField));
      ///Update moc card
      Moc.currentMoc[databaseName] = false;
      deleteField();
    } else {
      $('#field-lookup').attr('placeholder', 'Please add a field name');
    }
   
  }

  function deleteField(){
    ///Remove #field-lookup #new-field #delete-field from #added-field
    $('#added-field').empty();
  }

  $('#moc-editor-form').on('change', '#member-lookup', lookupMember);
  $('#moc-editor-form').on('change', '.moc-input', updateMember);
  $('#moc-editor-form').on('change', '#displayName', updateDisplayName);
  $('#moc-editor-form').on('click', '.member-info a', changeDropdown);
  $('#moc-editor-form').on('change', '#field-lookup', updateButtonValue);
  $('#moc-editor-form').on('click', '#add-field', addField);
  $('#moc-editor-form').on('click', '#new-field', newField);
  $('#moc-editor-form').on('click', '#delete-field', deleteField);
  $('#moc-editor-form').on('submit', saveMOC);

  module.mocEditorView = mocEditorView;
})(window);
