
(function (module) {
  var mocReportView = {};

  mocReportView.addFilter = function(filterObj, filterValue) {
    $currentState = $('#mm-current-state');
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

  function getAllCategories(returnedData) {
    return returnedData.map(function(ele){
      return {
        categoryID : ele.state.trim(),
        Category : ele.state,
        perCapita : 1
      };
    }).reduce(function(acc, cur){
      if (acc.map(function(mapItem){return mapItem['categoryID']; }).indexOf(cur['categoryID']) > -1) {
        acc[acc.map(function(mapItem){return mapItem['categoryID']; }).indexOf(cur['categoryID'])].count ++;
      } else {
        cur.count = 1;
        acc.push(cur);
      }
      return acc;
    },[]).sort(function(a, b){
      statea = a.categoryID;
      stateb = b.categoryID;
      if (statea > stateb) {
        return -1;
      } else if (stateb > statea) {
        return 1;
      }
      return 0;
    });
  }

  function startIsotope() {
    var $grid = $('.grid').isotope({
      itemSelector: '.element-item',
      getSortData: {
        townhall: '.townHallNumber parseInt' // text from querySelector
      },
      sortBy: 'townhall',
      sortAscending: false
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
      mocReportView.addFilter(filters, filterValue);
      $grid.isotope({ filter: filterValue });
    });
  }

  mocReportView.renderMembers = function(template, parent, member) {
    var compiledTemplate = Handlebars.getTemplate(template);
    $(parent).append($(compiledTemplate(member)));
  };

  firebase.database().ref('mocData/').on('child_changed', function(snapshot){
    var memberobj = snapshot.val();
    if (memberobj.in_office) {
      var name = memberobj.displayName;
      var lastUpdated = memberobj.lastUpdated? moment(memberobj.lastUpdated).fromNow(): 'Never';
      $('#' + memberobj.govtrack_id).remove();
      var member = {
        id: memberobj.govtrack_id,
        name: name,
        chamber : memberobj.type,
        lastUpdated : lastUpdated
      };
      mocReportView.renderMembers('mocReport', '.grid', member);
    }
  });
  mocReportView.clearAll = function(parent){
    $(parent).empty();
    dataviz.initalProgressBar(100, $('.dem-senate-report'), $('.dem-updated-senate'));
    dataviz.initalProgressBar(100, $('.rep-senate-report'), $('.rep-updated-senate'));
    dataviz.initalProgressBar(434, $('.dem-house-report'), $('.dem-updated-house'));
    dataviz.initalProgressBar(434, $('.rep-house-report'), $('.rep-updated-house'));
  }
  mocReportView.rendered = false;

  mocReportView.init = function(){
    mocReportView.clearAll('.grid')
    Moc.loadAllUpdated().then(function(returnedData){
      returnedData.sort(function(a, b){
        if (!b.daysAgo && b.daysAgo !== 0) {
          return 1
        }
        if (!a.daysAgo && a.daysAgo !== 0) {
          return -1
        }
        if (a.daysAgo > b.daysAgo) {
          return -1
        } else if (a.daysAgo < b.daysAgo) {
          return 1
        } else if (a.daysAgo == b.daysAgo){
          return 0
        }
      })
      returnedData.forEach(function(member){
        mocReportView.renderMembers('mocReport', '.grid', member);
      })
      allCategories = getAllCategories(returnedData);
      // missingMemberView.renderAll('missingMemberButton', '#state-buttons', allCategories);
      startIsotope();
      mocReportView.rendered= true;
    });
  }


  module.mocReportView = mocReportView;
})(window);
