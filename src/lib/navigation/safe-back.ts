type BackCapableRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: never) => void;
};

/**
 * Prefer history back; if the stack has nothing to pop (common after tab
 * switches / deep links), replace to a safe root so Cancel doesn't no-op.
 */
export function safeBack(router: BackCapableRouter, fallbackHref: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref as never);
}
