import { LegalPage } from '@/components/marketing/LegalPage';
import { SITE } from '@/lib/site';
export const metadata = { title: 'Privacy Policy' };

const Mail = () => <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="November 8, 2026">
      <p>netbyfriday is operated by Net By Friday LLC, a Georgia limited liability company (“netbyfriday,” “we,” “us”). This Privacy Policy explains what information we collect when you use netbyfriday.com and the netbyfriday app (the “Service”), how we use it, who we share it with, and the choices you have. It also covers people who never sign up but interact with the Service through a creator, such as a brand contact who opens an invoice link or signs an agreement.</p>
      <p>The short version: you enter your own business records, we use them only to run the Service for you, we don’t sell them, we don’t use them for advertising, and we don’t connect to your email, bank or social media accounts.</p>

      <h2>1. Information we collect</h2>
      <p><b>Information you give us</b></p>
      <ul>
        <li><b>Waitlist.</b> Your email address and, if you choose, your name, social handle and the kind of content you create.</li>
        <li><b>Account.</b> Your email address, a password (stored by our authentication provider in hashed form, never readable by us), your invite code, and onboarding answers such as your display name, business name and goals.</li>
        <li><b>Business records.</b> Everything you enter in your workspace: partnerships, brands, contacts (including names and email addresses of people you work with), deliverables, invoices, payments, income, expenses, tasks, notes, tax set-aside settings and goals.</li>
        <li><b>Contracts.</b> Contract PDFs you upload, and the terms you confirm from them.</li>
        <li><b>Contract generator.</b> Message text you paste (for example a brand email or DM), which is kept with the draft so you can refer back to it. Screenshots you upload are sent to our AI provider to be read once and are not stored by us.</li>
        <li><b>AI Advisor.</b> The questions you ask and the answers shown to you, saved in your workspace so you can see your history.</li>
        <li><b>Feedback and support.</b> Anything you send through the feedback form or by email.</li>
      </ul>
      <p><b>Information about people who sign or view documents</b></p>
      <ul>
        <li><b>Agreement signers.</b> When someone signs an agreement through a netbyfriday signing link, we record their name, title (if given), email address, typed signature, consent to sign electronically, the date and time, their IP address and browser information, and a fingerprint (SHA-256) of the exact text they signed. The same details are recorded when the creator signs, and when the link is first opened. This audit trail is part of the signed record and is visible to both parties.</li>
        <li><b>Invoice and agreement links.</b> Anyone with a private link can view that one invoice or agreement without an account. We don’t ask them for any information to view it.</li>
      </ul>
      <p><b>Information collected automatically</b></p>
      <ul>
        <li><b>Technical information</b> our hosting provider records as part of normal operation, such as IP address, browser type, and request logs, used for security and to keep the Service running.</li>
        <li><b>Product analytics, only if you opt in</b> under Settings. We record only the names of actions (for example “invoice created”), never amounts, names, or the content of your records. It is off unless you turn it on.</li>
        <li><b>Usage counts</b> of AI features, to enforce the hourly limit.</li>
      </ul>

      <h2>2. What we don’t do</h2>
      <ul>
        <li>We don’t sell or rent your personal information, and we don’t share it for cross-context behavioral advertising.</li>
        <li>We don’t connect to or scan your email, bank, calendar or social media accounts.</li>
        <li>We don’t send emails or messages on your behalf. Drafts, invoice links and agreement links are opened in your own email app for you to review and send yourself.</li>
        <li>We don’t show your records to other netbyfriday users. Each workspace is isolated at the database level.</li>
        <li>We don’t use advertising or third-party tracking cookies.</li>
      </ul>

      <h2>3. How we use information</h2>
      <ul>
        <li>To provide the Service: store your records, calculate your totals and dashboards, show reminders, generate invoices and agreements, and keep you signed in.</li>
        <li>To run the AI features you choose to use (see section 4).</li>
        <li>To keep a reliable record of signed agreements, including the audit trail.</li>
        <li>To secure the Service, prevent abuse, and enforce our <a href="/terms">Terms and Conditions</a>.</li>
        <li>To respond to you, and to improve the Service using your feedback and, if you opted in, product analytics.</li>
        <li>To manage the waitlist and invitations.</li>
        <li>To comply with law and respond to valid legal requests.</li>
      </ul>

      <h2>4. AI features</h2>
      <p>netbyfriday uses Anthropic (the maker of Claude) as its AI provider. When you use an AI feature, the information needed for that request is sent to Anthropic to produce a result:</p>
      <ul>
        <li><b>AI Advisor:</b> your question and the relevant records from your workspace.</li>
        <li><b>Contract reading:</b> the contract PDF or text you provide.</li>
        <li><b>Contract generator:</b> the message text or screenshot you provide.</li>
      </ul>
      <p>We use Anthropic’s commercial API. Under Anthropic’s commercial terms, data sent through the API is not used to train its models, and Anthropic keeps it only for a limited time for safety and abuse monitoring. AI results are suggestions: numbers are calculated by netbyfriday from your records, not by the AI, and nothing is changed in your workspace unless you confirm it.</p>

      <h2>5. Who we share information with</h2>
      <p>We share information only as described here:</p>
      <ul>
        <li><b>Service providers</b> who process data for us under contract: Supabase (database, authentication and file storage), Vercel (hosting), and Anthropic (AI processing). When paid plans begin, Stripe will process payments; we won’t see or store full card numbers.</li>
        <li><b>People you choose to share with.</b> When you send an invoice link or an agreement link, anyone with that link can view that document. A signed agreement, including its audit trail, is available to both parties.</li>
        <li><b>Legal reasons.</b> If required by law, or to protect the rights, safety or property of our users, the public, or netbyfriday.</li>
        <li><b>Business transfers.</b> If netbyfriday is involved in a merger, acquisition or sale of assets, your information may transfer as part of that deal, and this policy will continue to apply to it.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>We use only the cookies the Service needs: one to keep you signed in, and one to remember whether you’re viewing the demo. We don’t use advertising cookies or third-party trackers.</p>

      <h2>7. How long we keep information</h2>
      <ul>
        <li>Workspace records, uploaded contracts and AI Advisor history are kept while your account is open. You can delete individual records, and clear your Advisor history, at any time.</li>
        <li>When you delete your account in Settings, your workspace, every record in it, your uploaded files, your waitlist entry and your login are deleted right away. Copies in routine backups are overwritten on our providers’ backup schedule.</li>
        <li><b>Signed agreements are deleted too.</b> Deleting your account deletes the agreements in it, including signed ones and their audit trails, and their signing links stop working. Download or print any you need first; the other party keeps only the copy they saved.</li>
        <li>Waitlist entries are kept until you’re invited or ask to be removed.</li>
        <li>We may keep limited information as required by law, to resolve disputes, or to prevent abuse.</li>
      </ul>

      <h2>8. Security</h2>
      <p>Data is encrypted in transit. Each workspace is separated by row-level security in the database, uploaded contracts are stored in private storage, and invoice and agreement links use long, unguessable tokens that can be turned off. No system is perfectly secure, so please use a strong, unique password and keep your private links private.</p>

      <h2>9. Your choices and rights</h2>
      <ul>
        <li><b>Access and export.</b> Download your records at any time from Settings.</li>
        <li><b>Correction.</b> Edit your records directly in the app.</li>
        <li><b>Deletion.</b> Delete individual records in the app, or delete your whole account in Settings under Delete account. To be removed from the waitlist, email <Mail />.</li>
        <li><b>Analytics.</b> Turn product analytics on or off in Settings.</li>
      </ul>
      <p>Depending on where you live (for example California, Virginia, Colorado or other US states with privacy laws), you may have rights to know, access, correct, delete, or receive a copy of your personal information, and to not be discriminated against for using these rights. We don’t sell or share personal information for targeted advertising, so there is nothing to opt out of. To make a request, email <Mail />. We’ll verify your request using your account email, and you may use an authorized agent. If we decline your request, you can appeal by replying to our response.</p>
      <p><b>If a creator entered your information.</b> If you are a brand contact or other person whose details a creator added to their workspace, the creator controls that record. Please contact the creator first; you can also email us and we’ll help.</p>

      <h2>10. Children</h2>
      <p>netbyfriday is for people 18 and older. We don’t knowingly collect information from anyone under 18. If you believe a minor has given us information, email <Mail /> and we’ll delete it.</p>

      <h2>11. Where data is processed</h2>
      <p>netbyfriday is based in the United States, and our service providers store and process data in the United States. If you use the Service from outside the US, your information will be transferred to and processed in the US.</p>

      <h2>12. Changes to this policy</h2>
      <p>We’ll update this page when our practices change and change the date at the top. If a change is significant, we’ll tell you in the app or by email before it takes effect.</p>

      <h2>13. Contact</h2>
      <p>Net By Friday LLC · 2015 Jonesboro, Suite #305, McDonough, GA 30252 · <Mail /></p>
    </LegalPage>
  );
}
