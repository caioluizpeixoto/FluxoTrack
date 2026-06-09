// AdPulse Proprietary Pixel Script
(function() {
  // Helper to get cookies
  function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  // Parse URL search params
  const urlParams = new URLSearchParams(window.location.search);
  
  // Facebook Click ID from URL overrides cookie if present
  let fbclid = urlParams.get('fbclid') || '';
  let fbc = getCookie('_fbc') || '';
  if (fbclid && !fbc) {
      // fbc format: version.subdomainIndex.creationTime.fbclid
      // typically: fb.1.timestamp.fbclid
      fbc = 'fb.1.' + Date.now() + '.' + fbclid;
  } else if (!fbclid && fbc) {
      // Extract fbclid from the fbc cookie if it exists
      const parts = fbc.split('.');
      if(parts.length === 4) fbclid = parts[3];
  }

  const fbp = getCookie('_fbp') || '';
  
  // Grab UTMs
  const utmSource = urlParams.get('utm_source') || '';
  const utmMedium = urlParams.get('utm_medium') || '';
  const utmCampaign = urlParams.get('utm_campaign') || '';

  // Current Script Tag (to get data attributes if passed, like data-user-id or data-product-id)
  // We expect the script to be called with some identifier, or we rely on the URL if it's dynamic.
  // We'll pass the product ID or User ID explicitly in the snippet.
  const scripts = document.getElementsByTagName('script');
  let currentScript = null;
  let productId = '';
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.indexOf('adpulse-pixel.js') > -1) {
      currentScript = scripts[i];
      productId = currentScript.getAttribute('data-product-id') || '';
      break;
    }
  }

  // Build payload
  const payload = {
    userId: currentScript?.getAttribute('data-user-id') || 'unknown',
    productId: productId,
    eventType: 'PageView',
    url: window.location.href,
    utmSource: utmSource,
    utmMedium: utmMedium,
    utmCampaign: utmCampaign,
    fbclid: fbclid,
    fbp: fbp,
    fbc: fbc,
    referrer: document.referrer,
    userAgent: navigator.userAgent
  };

  // Send to AdPulse backend
  // In a real environment, we'd use the host where the script is loaded from
  const apiHost = currentScript ? new URL(currentScript.src).origin : window.location.origin;

  fetch(apiHost + '/api/tracking/pixel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    keepalive: true // Ensure it sends even if the page unloads
  }).catch(function(err) {
    console.error('AdPulse Pixel Tracking Error:', err);
  });

})();
