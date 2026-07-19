import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

// Expo Router uses this as the root HTML document for every static web page
// (see https://docs.expo.dev/router/reference/static-rendering/#root-html).
// The default document has no manifest link or PWA meta tags, so those are added here.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6B9FFF" />

        {/* Android/Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Safari has no manifest-driven install support, so these meta tags are
            what actually make "Add to Home Screen" launch as a standalone app there. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LazySpender" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* Expo auto-injects the favicon <link> from app.config.js's web.favicon */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
