import { useCallback, useState } from 'react';

/** PersianLabs/ui-style `use-copy-to-clipboard` hook. */
export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const el = document.createElement('textarea');
          el.value = text;
          el.setAttribute('readonly', '');
          el.style.position = 'absolute';
          el.style.left = '-9999px';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        }
        setError(null);
        setCopied(true);
        window.setTimeout(() => setCopied(false), timeout);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'کپی ناموفق بود');
        setCopied(false);
      }
    },
    [timeout]
  );

  return { copied, error, copy };
}

export default useCopyToClipboard;