// FluxoFy Proprietary Pixel Script
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
  let customIcText = '';
  let customIcUrl = '';
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.indexOf('fluxofy-pixel.js') > -1) {
      currentScript = scripts[i];
      productId = currentScript.getAttribute('data-product-id') || '';
      customIcText = (currentScript.getAttribute('data-ic-text') || '').toLowerCase();
      customIcUrl = (currentScript.getAttribute('data-ic-url') || '').toLowerCase();
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

  // Helper to send events
  function sendEvent(eventType, additionalData = {}) {
    const apiHost = currentScript ? new URL(currentScript.src).origin : window.location.origin;
    const finalPayload = { ...payload, eventType: eventType, ...additionalData };

    fetch(apiHost + '/api/tracking/pixel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(finalPayload),
      keepalive: true
    }).catch(function(err) {
      console.error('FluxoFy Pixel Tracking Error:', err);
    });
  }

  // Send initial PageView
  sendEvent('PageView');

  // Auto-detect InitiateCheckout (IC) clicks
  document.addEventListener('click', function(e) {
    let target = e.target;
    // Bubble up to find the nearest anchor or button
    while (target && target.tagName !== 'A' && target.tagName !== 'BUTTON') {
      target = target.parentElement;
    }

    if (target) {
      const text = (target.textContent || '').toLowerCase();
      const href = (target.href || '').toLowerCase();
      const id = (target.id || '').toLowerCase();
      const className = (target.className || '').toLowerCase();

      // Check if it looks like a checkout button
      let isCheckout = false;
      
      if (customIcText && text.includes(customIcText)) isCheckout = true;
      if (customIcUrl && href.includes(customIcUrl)) isCheckout = true;

      if (!customIcText && !customIcUrl) {
        // Fallback defaults se o usuário não configurou
        isCheckout = 
          text.includes('comprar') || 
          text.includes('quero') || 
          text.includes('checkout') || 
          text.includes('assinar') || 
          href.includes('pay.') || 
          href.includes('checkout') || 
          href.includes('hotmart.com') || 
          href.includes('kiwify.com') ||
          href.includes('perfectpay.com') ||
          href.includes('wiapy.com');
      }

      if (isCheckout) {
        sendEvent('InitiateCheckout', { 
          clickedUrl: target.href || null, 
          clickedText: target.textContent?.trim() || null 
        });
      }
    }
  });

})();
