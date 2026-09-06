// Ports staticwebapp.config.json's route rewrites to CloudFront, since
// expo-router's static web export emits one HTML file per top-level route
// rather than a single SPA index.html fallback. Keep this list in sync with
// frontend/staticwebapp.config.json / app/'s top-level routes.
var ROUTES = {
  "/dashboard": "/dashboard.html",
  "/login": "/login.html",
  "/records": "/records.html",
  "/planned-payments": "/planned-payments.html",
  "/account-access": "/account-access.html",
};

function handler(event) {
  var request = event.request;
  var rewrite = ROUTES[request.uri];

  if (rewrite) {
    request.uri = rewrite;
  }

  return request;
}
