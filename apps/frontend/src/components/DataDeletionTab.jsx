import { Link } from "react-router-dom";

export default function DataDeletionTab() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold">Data Deletion Instructions</h1>
        <p className="text-ink-muted text-sm mt-1">Last updated: August 7, 2026</p>
      </div>

      <div className="bg-surface border border-line rounded-xl p-6 space-y-6 text-ink">
        <section>
          <p className="text-ink-muted text-sm leading-relaxed">
            If you have messaged a business that uses RAVISN's messaging agent (over WhatsApp, Facebook Messenger, or Instagram), you can request that we delete the data associated with your conversation — including your messages, your platform identifier, and any booking details you shared.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">How to Request Deletion</h2>
          <p className="text-ink-muted text-sm leading-relaxed mb-2">
            Send an email to{" "}
            <a href="mailto:privacy@ravisn.com" className="text-accent font-medium hover:underline">
              privacy@ravisn.com
            </a>{" "}
            with:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-ink-muted text-sm">
            <li>The phone number or account handle you messaged from</li>
            <li>The name of the business you contacted (if known)</li>
            <li>A short statement that you're requesting deletion of your data</li>
          </ul>
          <p className="text-ink-muted text-sm leading-relaxed mt-2">
            We may ask you to confirm you're the person associated with that phone number or account, to make sure we're deleting the right data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">What Happens Next</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            We will locate and permanently delete your conversation history and any booking information from our active systems within 30 days of a verified request. We will confirm by email once this is complete.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">What We Cannot Delete</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            RAVISN does not control the underlying WhatsApp, Facebook, or Instagram platforms. Copies of your messages may still exist within Meta's own systems, subject to Meta's own privacy practices. We also may retain limited records where required by law (for example, financial records related to a completed transaction), which we will disclose to you if this applies to your request.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">Related</h2>
          <p className="text-ink-muted text-sm leading-relaxed">
            See our{" "}
            <Link to="/privacy" className="text-accent font-medium hover:underline" target="_blank">
              Privacy Policy
            </Link>{" "}
            for more on how we handle your information generally.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold mb-2">Contact</h2>
          <div className="text-ink-muted text-sm space-y-1">
            <p>RAVISN</p>
            <p>Lahore, Punjab, Pakistan</p>
            <p>
              <a href="mailto:privacy@ravisn.com" className="text-accent hover:underline">
                privacy@ravisn.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
