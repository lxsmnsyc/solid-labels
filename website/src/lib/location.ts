import { getRequestEvent, isServer } from '@solidjs/web';

/** The path of the page being rendered: the request on the server, the address bar in the browser. */
export function getCurrentPath(): string {
  if (isServer) {
    const event = getRequestEvent();
    return event === undefined ? '/' : new URL(event.request.url).pathname;
  }
  return window.location.pathname;
}
