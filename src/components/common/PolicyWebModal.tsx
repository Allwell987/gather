import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// Embedded HTML that renders the PRIVACY.md content using marked.js
const PRIVACY_MARKDOWN = `Privacy Policy — Gather

Effective date: June 1, 2026

1. Introduction

Gather ("we", "our", "us") provides a mobile application that helps users organize and participate in events and community features. This Privacy Policy explains what information we collect, how we use it, with whom we share it, and your choices regarding that information.

2. Contact

If you have questions about this policy or want to exercise your rights, contact: alexallwell.am@gmail.com

(This email was populated from the repository git config. Change it if you prefer a different support address.)

3. Data We Collect

- Account Information: name and email address when you sign in via Google or Apple.
- Profile Data: avatar/profile photos and profile fields you choose to provide.
- Content You Provide: posts, event details, images, and other content you upload or submit through the app (including prayer requests and comments).
- Usage and Device Data: device type, operating system, app version, crash logs, IP address, language, time zone, and app usage analytics.
- Metadata and Logs: timestamps, referral/source information, and metrics about how you use features.
- Location: approximate location if you enable location-based features (only with your permission).

4. How We Use Your Data

We use collected data to:

- Provide, operate, maintain, and improve the app and its features.
- Authenticate accounts and provide account recovery.
- Process and store content you submit (e.g., prayer requests, images) so other users can view/interact as intended.
- Communicate with you about account activity, updates, and support.
- Monitor and fix bugs and crashes; analyze usage to improve performance.
- Enforce our Terms of Service and protect against abuse.

5. Legal Basis (where applicable)

If you are in the EU or other jurisdictions that require a legal basis for processing, we rely on consent, contract performance, legitimate interests (app operation and security), and compliance with legal obligations, as applicable.

6. Third-Party Services and SDKs

We use third-party service providers to host infrastructure, store data, and provide analytics and monitoring. Examples used by Gather include:

- Supabase or other backend/database providers for user accounts and data storage.
- Firebase (may include Crashlytics, Cloud Messaging) for notifications and crash reporting.
- Sentry or similar for error monitoring and diagnostics.
- Third-party analytics providers for aggregated usage statistics.

Those third parties may receive certain data (such as logs, crash data, and identifiers). Their processing is governed by their own privacy policies. We do not control their practices; review their privacy pages for details.

7. Data Sharing and Disclosure

We may share data with:

- Service providers and vendors who perform services on our behalf (hosting, analytics, messaging).
- Other users: information you post or share publicly (e.g., event details, prayer requests, profile data).
- Legal and safety: when required by law, to respond to lawful requests, or to protect rights, property, or safety.

8. Data Retention

We retain personal data as long as necessary to provide services and for legitimate business purposes (e.g., account maintenance, dispute resolution, abuse prevention). You can request deletion of your account and data — see Section 11.

9. Security

We use industry-standard technical and organizational measures to protect data (encryption in transit, access controls). No system is completely secure; we encourage you to use a unique password and enable device security measures.

10. Children

The app is not intended for children under 13 (or higher age where required). We do not knowingly collect personal information from children. If we learn that a child under the applicable age has provided personal information, we will take steps to delete it.

11. Your Rights and Choices

Depending on your jurisdiction, you may have rights including access, correction, deletion, data portability, restriction of processing, and objection to processing. To exercise rights, contact: alexallwell.am@gmail.com. We may ask for information to verify your identity before fulfilling requests.

You can also:

- Manage or delete account data from within app settings (if available).
- Opt out of marketing communications by following unsubscribe links or contacting support.

12. Cookies and Similar Technologies

We (and our partners) may use cookies, local storage, and similar technologies to operate the app and collect analytics. Mobile apps typically use local storage and device identifiers rather than browser cookies.

13. International Transfers

Your data may be stored and processed in countries other than your own. We take steps to ensure adequate protections, but by using the app you consent to such transfers.

14. Changes to This Policy

We may update this policy from time to time. Material changes will be posted with an updated effective date. Continued use after changes constitutes acceptance of the updated policy.

15. How to Contact Us

For privacy questions or to exercise your rights, contact: alexallwell.am@gmail.com

16. Additional Notes for App Stores

- iOS App Store / Google Play: Provide a link to this Privacy Policy in the storefront listing and include any required data disclosure info (e.g., data collected categories for Apple’s App Privacy section).
- In-app: add a Settings > Privacy or About > Privacy link that opens this document (hosted on your website or bundled in the app).

17. Legal Disclaimer

This privacy policy is a template and does not constitute legal advice. If your app processes sensitive data or operates in regulated markets (GDPR, CCPA, HIPAA, etc.), consult legal counsel to ensure full compliance.`;

const HTML_TEMPLATE = (md: string) => `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{font-family:Helvetica,Arial,sans-serif;padding:16px;color:#0f172a} .container{max-width:900px;margin:0 auto} h1,h2{color:#0f172a}</style>
</head>
<body>
  <div class="container" id="content">Loading...</div>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(md)});</script>
</body>
</html>`;

export default function PolicyWebModal({ visible, onClose }: Props) {
  const html = HTML_TEMPLATE(PRIVACY_MARKDOWN);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <WebView source={{ html }} style={styles.webview} originWhitelist={["*"]} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#fff' },
  closeBtn: { padding: 8 },
  closeText: { color: '#0366d6', fontWeight: '600' },
  webview: { flex: 1 },
});
