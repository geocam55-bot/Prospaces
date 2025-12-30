# Cache favicons for 1 year
/favicon.ico
  Cache-Control: public, max-age=31536000, immutable
/favicon.svg
  Cache-Control: public, max-age=31536000, immutable
/favicon-*.png
  Cache-Control: public, max-age=31536000, immutable
/apple-touch-icon.png
  Cache-Control: public, max-age=31536000, immutable

# Don't cache service worker
/service-worker.js
  Cache-Control: no-cache, no-store, must-revalidate
  Service-Worker-Allowed: /

# Don't cache HTML
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
