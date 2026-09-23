/*
 * Lead forms — stamps two hidden fields at submit for the forms Worker
 * (sites/bidviewmarketing-staging/forms-worker):
 *   bv_fs — milliseconds the visitor spent on the page. Bots that POST straight
 *           from scraped HTML never run this, so their leads are saved but
 *           flagged and not emailed. A real person with JS off is never lost.
 *   page  — the page the form was sent from, so each lead shows its source.
 * Applies to every <form class="lead-form">.
 */
(function () {
  var start = Date.now();
  function stamp(form) {
    var fs = form.querySelector('input[name="bv_fs"]');
    if (fs) fs.value = String(Date.now() - start);
    var page = form.querySelector('input[name="page"]');
    if (page) page.value = location.pathname;
  }
  document.addEventListener(
    'submit',
    function (e) {
      var form = e.target;
      if (form && form.classList && form.classList.contains('lead-form')) stamp(form);
    },
    true
  );
})();
