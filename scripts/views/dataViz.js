(function(module) {
  var dataviz = {};

  function updateProgressBar($bar, total, $total){
    current = Number($bar.attr('data-count'));
    updated = current + 1;
    $bar.attr('data-count', updated);
    width = updated / total * 100;
    $bar.width(width + '%');
    $bar.text(updated);

    currentNoEvents = Number($total.attr('data-count'));
    updatedNoEvents = currentNoEvents - 1;
    $total.attr('data-count', updatedNoEvents);
    widthNoEvents = updatedNoEvents / total * 100;
    $total.width(widthNoEvents + '%');
    $total.text(updatedNoEvents);
  }

  dataviz.getPastEvents = function(path, dateStart, dateEnd, memberSet){
    var ref = firebase.database().ref(path);
    ref.orderByChild('dateObj').startAt(dateStart).endAt(dateEnd).on('child_added', function(snapshot) {
      dataviz.recessProgress(snapshot.val(), memberSet);
    });
  };

  function updateTotalEventsBar($bar){
    current = Number($bar.attr('data-count'));
    max = Number($bar.attr('data-max'));
    updated = current + 1;
    max = updated > max ? updated : max;
    width = updated / (max + 50) * 100;
    $bar.attr('data-count', updated);
    $bar.width(width + '%');
    $bar.text(updated);
  }

  function parseBars(party, chamber, newMember, total, type) {
    if (newMember) {
      $memberBar = $('.' + party + type + chamber);
      if (type === '-updated-') {
        $total = $('.' + party + '-' + chamber + '-report');
      } else {
        $total = $('.' + party + '-' + chamber);

      }
      updateProgressBar($memberBar, total, $total);
    }
    if (type === '-aug-progress-') {
      $bar = $('.' + party + '-aug-total-' + chamber);
      updateTotalEventsBar($bar);
    }
  }

  dataviz.membersEvents = new Set();

  dataviz.recessProgress = function (townhall, memberSet) {
    var total;
    var newMember = false;
    if (townhall.meetingType ==='Town Hall') {
      if (!memberSet.has(townhall.Member)) {
        newMember = true;
        memberSet.add(townhall.Member);
      }
      if (townhall.Party === 'Republican') {
        party = 'rep';
      } else {
        party = 'dem';
      }
      if (townhall.district) {
        total = 434;
        chamber = 'house';
      } else if (townhall.District === 'Senate') {
        total = 100;
        chamber = 'senate';
      } else if (townhall.District.split('-').length > 1){
        total = 434;
        chamber = 'house';
      } else {
        total = 100;
        chamber = 'senate';
      }
      parseBars(party, chamber, newMember, total, '-aug-progress-');
    }
  };

  dataviz.mocReportProgress = function (member) {
    var total;
    var newMember = true;
    if (member.party === 'Republican') {
      party = 'rep';
    } else {
      party = 'dem';
    }
    if (member.district) {
      total = 434;
      chamber = 'house';
    } else {
      total = 100;
      chamber = 'senate';
    }
    parseBars(party, chamber, newMember, total, '-updated-');

  };


  dataviz.initalProgressBar = function initalProgressBar(total, $total, $progress){
    currentNoEvents = Number($total.attr('data-start'));
    $total.attr('data-count', currentNoEvents);
    widthNoEvents = currentNoEvents / total * 100;
    $total.width(widthNoEvents + '%');
    $total.text(currentNoEvents);
    if ($progress) {
      $progress.attr('data-count', 0);
      $progress.width(0 + '%');
      $progress.text('');
    }
  };

  dataviz.resetGraph = function($bar){
    $bar.attr('data-count', 0);
    $bar.width(0 + '%');
    $bar.text('');
  }

  dataviz.reset = function(){
    dataviz.initalProgressBar(100, $('.dem-senate'), $('.dem-aug-progress-senate'));
    dataviz.initalProgressBar(100, $('.rep-senate'), $('.rep-aug-progress-senate'));
    dataviz.initalProgressBar(434, $('.dem-house'), $('.dem-aug-progress-house'));
    dataviz.initalProgressBar(434, $('.rep-house'), $('.rep-aug-progress-house'));
    dataviz.resetGraph($('.dem-aug-total-house'))
    dataviz.resetGraph($('.rep-aug-total-house'))
    dataviz.resetGraph($('.dem-aug-total-senate'))
    dataviz.resetGraph($('.rep-aug-total-senate'))
  }
  dataviz.lookUpEvents = function(e){
    e.preventDefault()
    dataviz.reset()
    dataviz.lookupMembers = new Set();
    var dateStart = moment($('#start-date').val()).startOf('day');
    var dateEnd = moment($('#end-date').val()).endOf('day');
    var start = dateStart.valueOf();
    var end = dateEnd.valueOf()

    var monthStart = dateStart.month();
    var monthEnd = dateEnd.month();
    var dates = []
    for (var i = monthStart; i <= monthEnd; i++) {
      dates.push('2017-' + i)
    }
    dates.forEach(function(date){
      dataviz.getPastEvents('townHallsOld/' + date, start, end, dataviz.lookupMembers);
    })
  }

  $('#progress-bar-form').on('submit', dataviz.lookUpEvents)
  dataviz.initalProgressBar(100, $('.dem-senate'));
  dataviz.initalProgressBar(100, $('.rep-senate'));
  dataviz.initalProgressBar(434, $('.dem-house'));
  dataviz.initalProgressBar(434, $('.rep-house'));

  module.dataviz = dataviz;
})(window);
