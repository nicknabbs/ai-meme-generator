export function trackEvent(eventName, properties = {}) {
  console.log('Track event:', eventName, properties);
}

export function trackMemeGeneration(template, source) {
  trackEvent('meme_generated', {
    template,
    source,
    timestamp: new Date().toISOString()
  });
}

export function trackShare(platform) {
  trackEvent('meme_shared', {
    platform,
    timestamp: new Date().toISOString()
  });
}