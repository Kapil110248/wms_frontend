import { useEffect, useState } from "react";
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

// Super-aggressive cookie-based approach: targets all possible domain/subdomain variants
function setGoogleTranslateCookie(lang) {
  const path = "path=/";
  const hostname = window.location.hostname;
  const cookieNames = ["googtrans"];
  const expires = "expires=Thu, 01 Jan 1970 00:00:00 UTC";

  // 1. Identify all potentially affected domains (e.g., warehousenew.kiaantechnology.com, .kiaantechnology.com)
  const domains = [hostname, "." + hostname];
  const domainParts = hostname.split('.');
  if (domainParts.length >= 2) {
    const rootDomain = domainParts.slice(-2).join('.');
    const dotRootDomain = "." + rootDomain;
    domains.push(rootDomain, dotRootDomain);
  }

  // Clear host-only
  document.cookie = `googtrans=; ${expires}; ${path}`;
  // Clear for each domain variant
  domains.forEach(d => {
    document.cookie = `googtrans=; ${expires}; ${path}; domain=${d}`;
  });

  // 2. SET new cookie
  const targetValue = (lang === "en" || lang === "EN") ? "/en/en" : `/en/${lang}`;
  
  // Set for current host (most reliable)
  document.cookie = `googtrans=${targetValue}; ${path}; SameSite=Lax`;
  
  // For live domains, also set for the root to be safe
  if (hostname !== 'localhost' && domainParts.length >= 2) {
    const rootDomain = domainParts.slice(-2).join('.');
    document.cookie = `googtrans=${targetValue}; ${path}; domain=.${rootDomain}; SameSite=Lax`;
    document.cookie = `googtrans=${targetValue}; ${path}; domain=${rootDomain}; SameSite=Lax`;
  }

  // Clear cookie completely for English as a final override if it's currently English
  if (lang === "en" || lang === "EN") {
     document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; ${path}`;
  }
  
  // Extra delay to ensure browser processed cookies before reload
  setTimeout(() => window.location.reload(), 300);
}

const GoogleTranslate = () => {
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    // Detect active language from cookie on load
    const match = document.cookie.match(/googtrans=\/en\/(\w+)/);
    if (match && match[1]) {
      setCurrentLang(match[1]);
    }

    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      try {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: "en,it",
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false,
            },
            "google_translate_element"
          );
        }
      } catch (e) {
        console.error("Google Translate init error:", e);
      }
    };

    // Load script if not present
    if (!document.getElementById("google-translate-script")) {
      const s = document.createElement("script");
      s.id = "google-translate-script";
      s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    } else if (window.google && window.google.translate) {
      // Re-run init if script is already present (e.g., SPA navigation)
      window.googleTranslateElementInit();
    }

    // MutationObserver: HIDE (don't remove) banner iframe and CLEAN styles
    const hideBanner = () => {
      const banner = document.querySelector(".goog-te-banner-frame");
      if (banner) {
        banner.style.display = 'none';
        banner.style.visibility = 'hidden';
        banner.style.height = '0';
      }

      // Reset body shifts
      if (document.body.style.top !== '0px') document.body.style.top = '0px';
      if (document.body.style.marginTop !== '0px') document.body.style.marginTop = '0px';
    };

    const observer = new MutationObserver(hideBanner);
    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
    hideBanner();

    return () => observer.disconnect();
  }, []);

  const handleChange = (val) => {
    console.log(`Switching language to: ${val}`);
    setCurrentLang(val);
    setGoogleTranslateCookie(val);
  };

  return (
    <>
      {/* Hidden widget required by Google Translate - strictly hidden */}
      <div id="google_translate_element" style={{ display: "none", visibility: "hidden", height: 0, width: 0, position: "absolute", overflow: "hidden" }} />

      <Select
        value={currentLang}
        onChange={handleChange}
        className="language-selector"
        style={{ width: 130 }}
        size="middle"
        variant="filled"
        suffixIcon={<GlobalOutlined className="text-blue-500" />}
        options={[
          {
            value: 'en',
            label: (
              <Space>
                <span>🇬🇧</span>
                <span className="font-medium">English</span>
              </Space>
            ),
          },
          {
            value: 'it',
            label: (
              <Space>
                <span>🇮🇹</span>
                <span className="font-medium">Italiano</span>
              </Space>
            ),
          },
        ]}
        styles={{ popup: { root: { borderRadius: '12px', padding: '4px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' } } }}
      />
    </>
  );
};

export default GoogleTranslate;
