// Preload for the real apps inside Tia (Instagram, WhatsApp Web, Slack): no passkey / security-key prompts.
// A sign-in page that asks for a passkey would open the Windows "insert your security key" window; here the request is
// refused at once, so the site falls back to email + password (+ the 2-step code). Nothing else is changed.
const { webFrame } = require("electron");
webFrame.executeJavaScript(`(() => {
  try {
    const c = navigator.credentials;
    if (!c) return;
    const no = () => Promise.reject(new DOMException("Passkeys are off in Tia – use your password.", "NotAllowedError"));
    const get = c.get.bind(c), create = c.create.bind(c);
    c.get = (o) => (o && o.publicKey ? no() : get(o));
    c.create = (o) => (o && o.publicKey ? no() : create(o));
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
      PublicKeyCredential.isConditionalMediationAvailable = () => Promise.resolve(false);
    }
  } catch (e) {}
})()`);
