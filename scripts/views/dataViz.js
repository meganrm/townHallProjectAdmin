/*globals eventHandler*/

(function(module) {
  var dataviz = {};

  function updateProgressBar($bar, total, $total){
    var current = Number($bar.attr('data-count'));
    var updated = current + 1;
    $bar.attr('data-count', updated);
    var width = updated / total * 100;
    $bar.width(width + '%');
    $bar.text(updated);

    var currentNoEvents = Number($total.attr('data-count'));
    var updatedNoEvents = currentNoEvents - 1;
    $total.attr('data-count', updatedNoEvents);
    var widthNoEvents = updatedNoEvents / total * 100;
    $total.width(widthNoEvents + '%');
    $total.text(updatedNoEvents);
  }

  dataviz.getPastEvents = function(path, dateStart, dateEnd, memberSet, houseMapping, senateMapping){
    var ref = firebase.database().ref(path);
    ref.orderByChild('dateObj').startAt(dateStart).endAt(dateEnd).on('child_added', function(snapshot) {
      dataviz.recessProgress(snapshot.val(), memberSet, houseMapping, senateMapping);
    });
  };

  function updateTotalEventsBar($bar){
    var current = Number($bar.attr('data-count'));
    var max = Number($bar.attr('data-max'));
    var updated = current + 1;
    max = updated > max ? updated : max;
    var width = updated / (max + 50) * 100;
    $bar.attr('data-count', updated);
    $bar.width(width + '%');
    $bar.text(updated);
  }

  function parseBars(party, chamber, newMember, total, type) {
    if (newMember) {
      var $memberBar = $('.' + party + type + chamber);
      if (type === '-updated-') {
        var $total = $('.' + party + '-' + chamber + '-report');
      } else {
        $total = $('.' + party + '-' + chamber);

      }
      updateProgressBar($memberBar, total, $total);
    }
    if (type === '-aug-progress-') {
      var $bar = $('.' + party + '-aug-total-' + chamber);
      updateTotalEventsBar($bar);
    }
  }



  function updateStateProgressBar($bar, $total, total, hasbeenUpdated) {
    if (hasbeenUpdated) {
      var current = Number($bar.attr('data-count'));
      var updated = current + 1;
      $bar.attr('data-count', updated);

    } else {
      var currentNoEvents = Number($total.attr('data-count'));
      var updatedNoEvents = currentNoEvents + 1;
      $total.attr('data-count', updatedNoEvents);

    }
    var width = updated / total * 100;
    $bar.width(width + '%');
    $bar.text(updated);
    var widthNoEvents = updatedNoEvents / total * 100;
    $total.width(widthNoEvents + '%');
    $total.text(updatedNoEvents);
  }

  dataviz.stateTotals = {
    lower: 0,
    upper: 0,
  };

  function updateWidths(chamber, total) {
    $('.' + chamber).each(function(){
      var current = Number($(this).attr('data-count'));
      var width = current / total * 100;
      $(this).width(width + '%');
    });
  }

  function parseStateBars(party, chamber, updated) {
    var $memberBar = $('.' + party + '-updated-' + chamber);
    var $total = $('.' + party + '-' + chamber + '-report');
    dataviz.stateTotals[chamber] ++;
    var total = dataviz.stateTotals[chamber];
    updateWidths(chamber, total);
    updateStateProgressBar($memberBar, $total, total, updated);
  }

  dataviz.membersEvents = new Set();

  function addToMapping(chamber, member, houseMapping, senateMapping) {
    if (chamber === 'house') {
      if (houseMapping[member]) {
        houseMapping[member] ++;
      } else {
        houseMapping[member] = 1;
      }
    } else {
      if (senateMapping[member]) {
        senateMapping[member] ++;
      } else {
        senateMapping[member] = 1;
      }
    }
  }

  dataviz.recessProgress = function (townhall, memberSet, houseMapping, senateMapping) {
    var total;
    var newMember = false;
    if (townhall.meetingType ==='Town Hall') {
      if (!memberSet.has(townhall.Member)) {
        newMember = true;
        memberSet.add(townhall.Member);
      }
      if (townhall.party === 'Republican') {
        var party = 'rep';
      } else {
        party = 'dem';
      }
      if (townhall.district) {
        total = 434;
        var chamber = 'house';
      } else {
        total = 100;
        chamber = 'senate';
      }
      addToMapping(chamber, townhall.Member, houseMapping, senateMapping);
      parseBars(party, chamber, newMember, total, '-aug-progress-');
    }
  };

  dataviz.mocReportProgress = function (member) {
    var total;
    var newMember = true;
    if (member.party === 'Republican') {
      var party = 'rep';
    } else {
      party = 'dem';
    }
    if ((!member.thp_id && member.district) || ( member.chamber === 'House')) {
      total = 434;
      var chamber = 'house';
    } else {
      total = 100;
      chamber = 'senate';
    }
    parseBars(party, chamber, newMember, total, '-updated-');
  };

  dataviz.stateLawmakerProgress = function(member, updated) {
    if (member.party === 'Republican') {
      var party = 'rep';
    } else {
      party = 'dem';
    }
    if ((!member.thp_id && member.district) || ( member.chamber === 'House')) {
      var chamber = 'upper';
    } else {
      chamber = 'lower';
    }
    parseStateBars(party, chamber, updated);
  };

  dataviz.initalProgressBar = function initalProgressBar(total, $total, $progress){
    var currentNoEvents = Number($total.attr('data-start'));
    $total.attr('data-count', currentNoEvents);
    var widthNoEvents = currentNoEvents / total * 100;
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
  };

  dataviz.reset = function(){
    dataviz.initalProgressBar(100, $('.dem-senate'), $('.dem-aug-progress-senate'));
    dataviz.initalProgressBar(100, $('.rep-senate'), $('.rep-aug-progress-senate'));
    dataviz.initalProgressBar(435, $('.dem-house'), $('.dem-aug-progress-house'));
    dataviz.initalProgressBar(435, $('.rep-house'), $('.rep-aug-progress-house'));
    dataviz.resetGraph($('.dem-aug-total-house'));
    dataviz.resetGraph($('.rep-aug-total-house'));
    dataviz.resetGraph($('.dem-aug-total-senate'));
    dataviz.resetGraph($('.rep-aug-total-senate'));
  };

  dataviz.lookUpEvents = function(e){
    e.preventDefault();
    dataviz.reset();
    dataviz.lookupMembers = new Set();
    dataviz.houseMemberMapping = {};
    dataviz.sentateHouseMapping = {};
    var dateRange = eventHandler.getDateRange();
    var dates = dateRange.dates;
    var start = dateRange.start;
    var end = dateRange.end;
    firebase.database().ref('townHalls/').once('value')
      .then((snapshot)=> {
        snapshot.forEach((townahll) => {
          dataviz.recessProgress(townahll.val(), dataviz.lookupMembers, dataviz.houseMemberMapping, dataviz.sentateHouseMapping);
        });
      });
    dates.forEach(function(date){
      dataviz.getPastEvents('townHallsOld/' + date, start, end, dataviz.lookupMembers, dataviz.houseMemberMapping,  dataviz.sentateHouseMapping);
    });
  };

  $('#progress-bar-form').on('submit', dataviz.lookUpEvents);
  dataviz.initalProgressBar(100, $('.dem-senate'));
  dataviz.initalProgressBar(100, $('.rep-senate'));
  dataviz.initalProgressBar(435, $('.dem-house'));
  dataviz.initalProgressBar(435, $('.rep-house'));

  module.dataviz = dataviz;
})(window);
