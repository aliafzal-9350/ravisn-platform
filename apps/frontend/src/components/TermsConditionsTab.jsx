export default function TermsConditionsTab() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold">Terms and Conditions</h1>
        <p className="text-ink-muted text-sm mt-1">Last updated: August 7, 2026</p>
      </div>

      <div className="bg-surface border border-line rounded-xl p-6 space-y-6 text-ink">
        <section>
          <h2 className="font-display text-lg font-semibold mb-2">1. Acceptance of These Terms</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            By creating an account or using RAVISN's messaging agent platform ("the Service"), you agree to these
            Terms and Conditions on behalf of yourself and the business you represent ("you," "your," "Business Client").
            If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">2. Description of Service</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            RAVISN provides a platform that connects to WhatsApp, Facebook Messenger, and Instagram Direct Messages on
            your behalf, and uses an AI language model to automatically reply to your customers based on a knowledge base you
            create and maintain. The Service also lets you view conversations and capture booking information submitted by your customers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">3. Eligibility and Your Account</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            You must be at least 18 years old and authorized to act on behalf of the business you register. You are responsible
            for keeping your login credentials secure and for all activity under your account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">4. Connecting Your Messaging Channels</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            You may only connect WhatsApp numbers, Facebook Pages, and Instagram accounts that you own or are authorized to manage.
            Connecting a channel through RAVISN does not transfer ownership of that channel to RAVISN, and you may disconnect it at any time.
          </p>
          <p className="text-ink-muted text-sm leading-relaxed mt-2">
            Your use of WhatsApp, Facebook Messenger, and Instagram through RAVISN remains subject to Meta's own platform policies and terms of service.
            RAVISN is not responsible for any suspension, restriction, or ban of your account by Meta, whether related to your use of RAVISN or otherwise.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">5. Your Knowledge Base and AI-Generated Replies</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            Replies sent to your customers are generated automatically by an AI language model, based only on the knowledge base content you provide.
            You are responsible for the accuracy and appropriateness of the content you add to your knowledge base. RAVISN does not guarantee that every AI-generated reply
            will be accurate, and recommends reviewing conversations periodically, especially for sensitive topics like pricing, medical, or legal matters.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">6. Acceptable Use</h2>
          <p className="text-ink-muted text-sm leading-relaxed mb-2">You agree not to use the Service to:</p>
          <ul className="list-disc list-inside space-y-1.5 text-ink-muted text-sm">
            <li>Send unlawful, harassing, deceptive, or harmful content to any person</li>
            <li>Send unsolicited bulk messages to people who have not opted in to hear from your business</li>
            <li>Violate the terms of service of WhatsApp, Meta, or any platform the Service connects to</li>
            <li>Attempt to interfere with, disrupt, or gain unauthorized access to the Service or other users' accounts</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">7. Fees and Payment</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            [Placeholder — RAVISN's specific pricing, billing cycle, and refund policy should be added here.]
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">8. Ownership of Your Data and Content</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            You retain ownership of your knowledge base content and any customer data collected through your connected channels.
            RAVISN retains ownership of the underlying software and platform. Our Privacy Policy explains how we handle customer data collected on your behalf.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">9. Dependence on Third-Party Platforms</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            The Service depends on WhatsApp, Meta's Graph API, and third-party AI providers remaining available and unchanged. RAVISN is not liable for any disruption, feature change, or discontinuation caused by these third parties.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">10. Service Availability</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            The Service is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted or error-free operation.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">11. Limitation of Liability</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            To the maximum extent permitted by law, RAVISN will not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including lost business, lost messages, or missed bookings.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">12. Termination</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            You may stop using the Service and disconnect your channels at any time. RAVISN may suspend or terminate accounts that violate these Terms, with notice where reasonably possible.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">13. Changes to These Terms</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            We may update these Terms from time to time. Continued use of the Service after a change constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">14. Governing Law</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            [Placeholder — these Terms are currently drafted assuming the laws of Pakistan will govern, given RAVISN is based in Lahore. Confirm this is correct, especially given RAVISN also serves clients in the United States.]
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">15. Contact Us</h2>
          <div className="text-ink-muted text-sm space-y-1">
            <p>RAVISN</p>
            <p>Lahore, Punjab, Pakistan</p>
            <p>
              <a href="mailto:legal@ravisn.com" className="text-accent hover:underline">
                legal@ravisn.com
              </a>
            </p>
            <p>
              <a href="https://ravisn.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                ravisn.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
