// The page's Lenis instance, if SmoothScroll has made one (it doesn't under
// reduced motion). The page transition uses it for links to the page you're
// already on, so they scroll the same way in-page #links do.
let current = null;

export const setLenis = (lenis) => {
  current = lenis;
};

export const getLenis = () => current;
