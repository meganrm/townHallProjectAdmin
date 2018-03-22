/*globals dataviz MoStateLeg*/
(function (module) {
  var stateLawmakerReportView = {};

  stateLawmakerReportView.addFilter = function(filterObj, filterValue) {
    var $currentState = $('#mm-current-state');
    var total = parseInt($currentState.attr('data-total'));
    var nofilters = true;
    Object.keys(filterObj).forEach(function(filter){
      if (filterObj[filter].length > 0) {
        nofilters = false;
        $('.' + filter).remove();
        var removeFilterbutton = '<li class="mm-turn-off-filter button-group ' + filter + '" data-filter-group=' + filter + '><button class=" btn-filter btn btn-secondary btn-xs" ' +
                       'data-filter="" >' +
                          filterObj[filter].split('.')[1] + '<i class="fa fa-times" aria-hidden="true"></i>' +
                        '</button></li>';
        $('#mm-filter-info').append(removeFilterbutton);
      } else if (filterObj[filter].length === 0) {
        $('.' + filter).remove();
      }
    });
    var cur =   nofilters ? total : $(filterValue).length;
    $currentState.text('Viewing ' + cur + ' of ' + total + ' total missing members');
  };


  // flatten object by concatting values
  function concatValues( obj ) {
    var value = '.element-item';
    for ( var prop in obj ) {
      value += obj[ prop ];
    }
    return value;
  }


  function startIsotope() {
    var $grid = $('.grid').isotope({
      itemSelector: '.element-item',
      getSortData: {
        townhall: '.townHallNumber parseInt', // text from querySelector
      },
      sortBy: 'townhall',
      sortAscending: false,
    });
    // layout Isotope after each image loads
    $grid.isotope('layout');
    var filters = {};
    $('.filter-button-group').on( 'click', '.btn-filter', function() {
      var $this = $(this);
      // get group key
      var $buttonGroup = $this.parents('.button-group');
      var filterGroup = $buttonGroup.attr('data-filter-group');
      // set filter for group
      filters[ filterGroup ] = $this.attr('data-filter');
      // combine filters
      var filterValue = concatValues( filters );
      stateLawmakerReportView.addFilter(filters, filterValue);
      $grid.isotope({ filter: filterValue });
    });
  }

  stateLawmakerReportView.renderMembers = function(template, parent, member) {
    var compiledTemplate = Handlebars.getTemplate(template);
    $(parent).append($(compiledTemplate(member)));
  };

  // firebasedb.ref('state_legislators_data/CO').on('child_changed', function(snapshot) {
  //   var memberobj = snapshot.val();
  //   if (memberobj.in_office) {
  //     var name = memberobj.displayName;
  //     var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
  //     $('#' + memberobj.govtrack_id).remove();
  //     var member = {
  //       id: memberobj.govtrack_id,
  //       name: name,
  //       chamber : memberobj.type,
  //       lastUpdated : lastUpdated,
  //     };
  //     stateLawmakerReportView.renderMembers('mocReport', '.grid', member);
  //   }
  // });

  stateLawmakerReportView.clearAll = function(parent){
    $(parent).empty();
    dataviz.initalProgressBar(100, $('.dem-senate-report'), $('.dem-updated-senate'));
    dataviz.initalProgressBar(100, $('.rep-senate-report'), $('.rep-updated-senate'));
    dataviz.initalProgressBar(434, $('.dem-house-report'), $('.dem-updated-house'));
    dataviz.initalProgressBar(434, $('.rep-house-report'), $('.rep-updated-house'));
  };

  stateLawmakerReportView.rendered = false;

  stateLawmakerReportView.init = function(path){
    stateLawmakerReportView.clearAll('.grid');
    MoStateLeg.loadAllUpdated(path).then(function(returnedData){
      returnedData.sort(function(a, b){
        if (!b.daysAgo && b.daysAgo !== 0) {
          return 1;
        }
        if (!a.daysAgo && a.daysAgo !== 0) {
          return -1;
        }
        if (a.daysAgo > b.daysAgo) {
          return -1;
        } else if (a.daysAgo < b.daysAgo) {
          return 1;
        } else if (a.daysAgo == b.daysAgo){
          return 0;
        }
      });
      returnedData.forEach(function(member){
        stateLawmakerReportView.renderMembers('mocReport', '.grid', member);
      });
      // var allCategories = getAllCategories(returnedData);
      // missingMemberView.renderAll('missingMemberButton', '#state-buttons', allCategories);
      startIsotope();
      stateLawmakerReportView.rendered =  true;
    });
  };

  stateLawmakerReportView.getLawMakerReport = function(){
    var state = $(this).attr('data-state');
    var path = 'state_legislators_data/' + state + '/';
    stateLawmakerReportView.init(path);
  };

  $('.state-lawmaker-report-group button').on('click', stateLawmakerReportView.getLawMakerReport);

  stateLawmakerReportView.init();
  module.stateLawmakerReportView = stateLawmakerReportView;
})(window);
