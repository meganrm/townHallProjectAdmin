/*globals eventHandler */

(function (module) {
  var updateStateEventView = {};

  updateStateEventView.getStateEvents = function(){
    var state = $(this).attr('data-state');

    var path = 'state_townhalls/' + state + '/';
    $('#state-events-table .event-row').remove();
    $('#state-events-table').attr('data-state', state);
    eventHandler.readStateData(path);
  };

  $('.state-public-event-switcher-group button').on('click', updateStateEventView.getStateEvents);

  module.updateStateEventView = updateStateEventView;
})(window);
