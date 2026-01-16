export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');

    script.onload = resolve;
    script.onerror = reject;

    script.async = true;
    script.type = 'text/javascript';
    script.src = src;

    document.body.appendChild(script);
  });
};
