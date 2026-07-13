// Shared footer — loaded on every page
(function() {
  var html =
    '<footer class="footer">' +
      '<p>LIBERTY CITY EMERGENCY SERVICES &bull; EST. 2008</p>' +
      '<p class="sig">LCES-26 &mdash; Still serving, still protecting</p>' +
      '<p style="margin-top:0.75rem;opacity:0.35;font-size:0.6rem;max-width:1000px;margin-left:auto;margin-right:auto;line-height:1.4;">LCES-26 is a fan revival project. LCES was originally founded in 2008 by Harper, Huskerguy and Steven. We are not affiliated with Rockstar Games, Microsoft, or Take-Two Interactive. All original content and trademarks belong to&nbsp;their&nbsp;respective&nbsp;owners.</p>' +
    '</footer>';

  var el = document.getElementById('footer');
  if (el) el.outerHTML = html;
})();
