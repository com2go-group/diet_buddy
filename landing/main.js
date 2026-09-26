// Applies config.js to the page: store links, legal links, contact and copyright.
(function () {
  const c = window.DIETBUDDY || {};
  const stores = { ios: c.appStoreUrl, android: c.playStoreUrl };

  document.querySelectorAll('[data-store]').forEach(function (a) {
    const url = stores[a.getAttribute('data-store')];
    if (url) {
      a.href = url;
      a.rel = 'noopener';
    } else {
      // Not live yet: keep the button, say so, and don't navigate away.
      a.classList.add('soon');
      a.setAttribute('aria-disabled', 'true');
      const label = a.querySelector('small');
      if (label) label.textContent = 'Coming soon to';
      a.addEventListener('click', function (e) {
        e.preventDefault();
      });
    }
  });

  const links = {
    privacy: c.privacyUrl,
    terms: c.termsUrl,
    deleteAccount: c.deleteAccountUrl,
    contact: c.supportEmail ? 'mailto:' + c.supportEmail : null,
  };
  document.querySelectorAll('[data-link]').forEach(function (a) {
    const url = links[a.getAttribute('data-link')];
    if (url) a.href = url;
    else if (a.getAttribute('data-link') === 'contact') a.parentElement.remove();
  });

  // Legal entity details in the Privacy Policy and Terms (unless baked in when generated).
  const legal = {
    company: c.legalCompany,
    address: c.legalAddress,
    email: c.legalEmail,
    country: c.legalCountry,
  };
  document.querySelectorAll('[data-legal]').forEach(function (el) {
    const value = legal[el.getAttribute('data-legal')];
    if (value) el.textContent = value;
  });

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
  if (c.company) {
    document.querySelectorAll('[data-company]').forEach(function (el) {
      el.textContent = c.company;
    });
  }
})();
