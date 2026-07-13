// Updates the "Badges Issued" count from embedded roster data
// Uses window.__rosterData from roster-data.js — roster.json is NOT deployed
(function() {
  function updateCount(data) {
    var el = document.getElementById('badge-count');
    if (el) el.textContent = data.filter(function(e) { return e.status === 'active'; }).length;
  }

  if (window.__rosterData) {
    updateCount(window.__rosterData);
  }
})();
