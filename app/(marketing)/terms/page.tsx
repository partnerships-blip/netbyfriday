import { LegalPage } from '@/components/marketing/LegalPage';
import { SITE } from '@/lib/site';
export const metadata = { title: 'Terms' };
export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="November 2026">
      <p>These terms cover your use of netbyfriday during the private beta. By creating an account you agree to them. netbyfriday is operated by [legal entity name].</p>
      <h2>The beta</h2>
      <p>netbyfriday is in active development. Features may change, and the service may occasionally be unavailable. Beta access is free and by invitation; invite codes are personal and should not be shared publicly.</p>
      <h2>Your content</h2>
      <p>You own the records you enter. You give us permission to store and process them only to run the service for you, including sending relevant records to our AI provider when you use the Advisor. You are responsible for the accuracy of what you enter.</p>
      <h2>What netbyfriday is and isn’t</h2>
      <ul><li>netbyfriday is an organizational tool. It is not a payment service, bank, accountant, lawyer or tax adviser, and it does not control when brands pay.</li>
        <li>Calculations are based only on the records you enter. Forecasts and projections are estimates, not guarantees.</li>
        <li>AI Advisor answers and drafts can be wrong. Review them before relying on them or sending anything. Nothing is sent or changed unless you confirm it.</li></ul>
      <h2>Acceptable use</h2>
      <p>Don’t use netbyfriday to break the law, to store other people’s information without a right to do so, to attempt to access another user’s data, or to overload or disrupt the service.</p>
      <h2>Ending your access</h2>
      <p>You can stop using netbyfriday and ask us to delete your account at any time. We may suspend accounts that break these terms. During the beta we may end the beta program with reasonable notice; you can export your records first.</p>
      <h2>Liability</h2>
      <p>The beta is provided “as is.” [Limitation of liability and governing law to be confirmed by counsel.]</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
    </LegalPage>
  );
}
