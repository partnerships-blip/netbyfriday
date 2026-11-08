import { LegalPage } from '@/components/marketing/LegalPage';
import { SITE } from '@/lib/site';
export const metadata = { title: 'Terms and Conditions' };

const Mail = () => <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;

export default function Terms() {
  return (
    <LegalPage title="Terms and Conditions" updated="November 8, 2026">
      <p>These Terms and Conditions (“Terms”) are an agreement between you and Net By Friday LLC, a Georgia limited liability company (“netbyfriday,” “we,” “us”), and cover your use of netbyfriday.com and the netbyfriday app (the “Service”). By joining the waitlist, creating an account, or using the Service, you agree to these Terms and to our <a href="/privacy">Privacy Policy</a>. If you use the Service for a business, you agree on its behalf and confirm you have authority to do so.</p>
      <p>Please read section 13 (Disputes) carefully. It explains how disputes are handled.</p>

      <h2>1. Who can use netbyfriday</h2>
      <p>You must be at least 18 and able to form a binding contract. Access during the private beta is by invitation. Invite codes are personal; don’t share them publicly. You’re responsible for keeping your password secure and for activity under your account. Tell us right away at <Mail /> if you think your account has been accessed without permission.</p>

      <h2>2. The private beta</h2>
      <p>netbyfriday is in private beta. It is free during the beta. Features may change, be added or be removed, and the Service may sometimes be unavailable or contain errors. Keep your own copies of anything important; you can export your records from Settings at any time.</p>

      <h2>3. What netbyfriday is, and isn’t</h2>
      <ul>
        <li>netbyfriday is a tool for organizing your creator business: your partnerships, deliverables, invoices, payments, expenses, contracts and tasks.</li>
        <li>It is <b>not</b> a bank, payment processor, collection agency, law firm, accountant, or tax, legal or financial adviser. Nothing in the Service is legal, tax, accounting or financial advice.</li>
        <li>We don’t control whether or when a brand pays you, and we don’t guarantee any payment or outcome.</li>
        <li>Totals, dashboards and forecasts are calculated only from the records you enter. Revenue counts only payments and income you record. Projections and estimates are not guarantees.</li>
        <li><b>Taxes.</b> The tax set-aside is a planning estimate based on the rate you choose and the payments you record. It isn’t a tax calculation or filing. Talk to a tax professional about what you owe.</li>
      </ul>

      <h2>4. AI features</h2>
      <p>The AI Advisor, contract reading and the contract generator use an AI provider to read the information you give them and make suggestions. AI output can be incomplete or wrong. Review everything before relying on it. In particular:</p>
      <ul>
        <li>Numbers are calculated by netbyfriday from your records, not by the AI.</li>
        <li>The AI only proposes. Nothing is created, changed or sent unless you review it and confirm.</li>
        <li>Terms read from a contract, email, DM or screenshot are suggestions. Check each one against the original.</li>
        <li>AI features have usage limits, including an hourly limit, and may be unavailable at times.</li>
      </ul>

      <h2>5. Contracts, the contract generator and e-signing</h2>
      <ul>
        <li><b>Templates, not legal advice.</b> Agreements made with the contract generator use a standard plain-English template filled in with terms you review and edit. The template may not suit your situation or your state’s law and hasn’t been prepared for your specific deal. You’re responsible for the terms you send. Consider having a lawyer review important agreements.</li>
        <li><b>We’re not a party.</b> Agreements you make with brands or anyone else, whether generated, uploaded or signed in netbyfriday, are between you and the other party. netbyfriday isn’t a party to them, doesn’t enforce them, and isn’t responsible for either side’s performance.</li>
        <li><b>Electronic signatures.</b> When you sign, or send an agreement for signature, you agree to do business electronically and that your typed signature is your legal signature. Each signer agrees to the same before signing. After an agreement is sent, its text is locked, and a signed agreement can’t be changed or deleted.</li>
        <li><b>Signer identity.</b> netbyfriday records the signer’s name, email, time, IP address, browser and a fingerprint of the signed text, but doesn’t verify a signer’s identity. You’re responsible for sending the signing link only to the right person. For high-value deals, consider a signing service that verifies identity.</li>
        <li><b>Private links.</b> Anyone with an invoice or agreement link can view that document. Share links only with the intended recipient, and turn a link off if it was sent to the wrong person.</li>
        <li><b>No sending by us.</b> netbyfriday doesn’t send emails or messages for you. You send invoices, agreements and drafts from your own email.</li>
      </ul>

      <h2>6. Your content</h2>
      <p>You own the records, files and text you add to netbyfriday (“Your Content”). You give us a limited permission to host, store, copy, process and display Your Content only to run, secure and improve the Service for you, including sending the relevant parts to our service providers (such as our AI provider) when you use a feature that needs them. We don’t claim ownership of Your Content.</p>
      <p>You’re responsible for Your Content, and you confirm you have the right to add it, including other people’s names and contact details and any contracts or messages you upload or paste. Feedback you send us may be used to improve netbyfriday without any obligation to you.</p>

      <h2>7. Acceptable use</h2>
      <p>Don’t use netbyfriday to:</p>
      <ul>
        <li>break the law, or to defraud, mislead or harass anyone, including by sending false invoices or agreements;</li>
        <li>sign, or ask someone to sign, on behalf of a person without their authority;</li>
        <li>upload information you don’t have the right to use, or malicious files;</li>
        <li>try to access another user’s data or bypass security, usage limits or access controls;</li>
        <li>reverse engineer, scrape, overload or disrupt the Service; or</li>
        <li>use the AI features to try to get them to ignore their rules, or to build a competing product.</li>
      </ul>

      <h2>8. Our service</h2>
      <p>netbyfriday, including its software, design, templates and brand, belongs to Net By Friday LLC and is protected by law. We give you a personal, non-exclusive, non-transferable right to use the Service under these Terms. We may change, suspend or stop any part of the Service.</p>

      <h2>9. Fees</h2>
      <p>The Service is free during the private beta. If we introduce paid plans, we’ll tell you the price before it applies, and nobody is moved to a paid plan without choosing it. Paid plans will have their own terms, which you’ll see before you buy.</p>

      <h2>10. Ending your use</h2>
      <p>You can stop using netbyfriday at any time and delete your account in Settings. Deleting is permanent and removes all your records, including signed agreements, so export anything you need first. We may suspend or close your account if you break these Terms, if we must for legal reasons, or to protect the Service or other people. We may also end the beta; when we can, we’ll give you reasonable notice so you can export your records. Sections 3 to 6 and 11 to 15 continue after your use ends.</p>

      <h2>11. Disclaimers</h2>
      <p>THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE FULLEST EXTENT ALLOWED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. WE DON’T WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE, THAT CALCULATIONS OR AI OUTPUT WILL BE ACCURATE OR COMPLETE, OR THAT ANY AGREEMENT OR TEMPLATE WILL BE ENFORCEABLE OR SUITABLE FOR YOUR PURPOSE.</p>

      <h2>12. Limitation of liability</h2>
      <p>TO THE FULLEST EXTENT ALLOWED BY LAW, NETBYFRIDAY AND ITS OWNERS, EMPLOYEES AND SUPPLIERS WON’T BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA OR BUSINESS OPPORTUNITIES, INCLUDING UNPAID INVOICES OR DISPUTES WITH BRANDS, ARISING FROM OR RELATED TO THE SERVICE. OUR TOTAL LIABILITY FOR ALL CLAIMS RELATED TO THE SERVICE IS LIMITED TO THE GREATER OF THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM OR $100. SOME PLACES DON’T ALLOW THESE LIMITS, SO THEY MAY NOT ALL APPLY TO YOU.</p>
      <p>You agree to defend and indemnify netbyfriday against claims from third parties arising from Your Content, agreements you make with others, or your breach of these Terms or the law.</p>

      <h2>13. Disputes</h2>
      <p>If you have a concern, email <Mail /> first; most issues can be resolved quickly. These Terms are governed by the laws of the State of Georgia, USA, without regard to conflict-of-law rules. Any dispute arising from these Terms or the Service will be brought only in the state or federal courts located in Georgia, and you and we consent to those courts’ jurisdiction. Either party may bring a qualifying claim in small claims court.</p>

      <h2>14. Changes to these Terms</h2>
      <p>We may update these Terms. We’ll change the date at the top and, for significant changes, tell you in the app before they take effect. If you keep using the Service after a change takes effect, you accept the updated Terms.</p>

      <h2>15. General</h2>
      <p>These Terms and the Privacy Policy are the whole agreement between you and us about the Service. If any part is found unenforceable, the rest stays in effect. If we don’t enforce a part right away, we haven’t waived it. You can’t transfer these Terms without our consent; we may transfer them as part of a merger, acquisition or sale of assets. Neither party is responsible for delays caused by events outside its reasonable control.</p>

      <h2>16. Contact</h2>
      <p>Net By Friday LLC · 2015 Jonesboro Rd, Suite #305, McDonough, GA 30252 · <Mail /></p>
    </LegalPage>
  );
}
