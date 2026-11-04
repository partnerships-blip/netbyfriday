import { LegalPage } from '@/components/marketing/LegalPage';
import { SITE } from '@/lib/site';
export const metadata = { title: 'Privacy' };
export default function Privacy() {
  return (
    <LegalPage title="Privacy notice" updated="November 2026">
      <p>netbyfriday is operated by [legal entity name] (“we”). This notice explains what we collect, why, and the choices you have.</p>
      <h2>What we collect</h2>
      <ul><li><b>Waitlist:</b> your email address, and optionally your name, handle and the kind of content you create.</li>
        <li><b>Account:</b> your email address and a password (stored by our authentication provider in hashed form).</li>
        <li><b>Business records you enter:</b> partnerships, brands, contacts, deliverables, invoices, payments, income, expenses, tasks and notes.</li>
        <li><b>AI Advisor:</b> the questions you ask and the answers shown to you, saved to your workspace so you can see your history. You can clear it at any time.</li>
        <li><b>Product analytics:</b> only if you opt in under Settings, and only the names of actions (for example “invoice created”), never amounts, names or record content.</li></ul>
      <h2>What we don’t do</h2>
      <ul><li>We don’t connect to your email, bank or social media accounts.</li><li>We don’t sell your data or use it for advertising.</li><li>We don’t send emails or messages on your behalf. AI drafts are only ever opened in your own email app for you to review.</li></ul>
      <h2>How the AI Advisor uses your data</h2>
      <p>When you ask the Advisor a question, the relevant records from your workspace and your question are sent to our AI provider ([AI provider name]) to produce an answer. They are processed under the provider’s API terms, which [confirm: do not permit training models on this data]. Your records are never shared with other netbyfriday users.</p>
      <h2>Where your data lives</h2>
      <p>Your data is stored with our database provider (Supabase) and the app is hosted by Vercel, both in the United States. Each workspace is isolated at the database level so other users cannot read it.</p>
      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you signed in and remember the demo setting. No advertising or third-party tracking cookies.</p>
      <h2>Your choices</h2>
      <ul><li>Download all your records from Settings at any time.</li><li>Ask us to delete your account and records, or to remove you from the waitlist, by emailing <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</li></ul>
      <h2>Contact</h2>
      <p>Questions about privacy: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. [Postal address to be added.]</p>
    </LegalPage>
  );
}
