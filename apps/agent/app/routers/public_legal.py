from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["public-legal"])

HTML_STYLE = """
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0c10; color: #e0e6ed; margin: 0; padding: 40px 20px; line-height: 1.6; }
  .container { max-width: 720px; margin: 0 auto; background: #151821; padding: 36px; border-radius: 12px; border: 1px solid #282c3c; }
  h1 { font-size: 26px; font-weight: 700; color: #ffffff; margin-top: 0; }
  h2 { font-size: 18px; font-weight: 600; color: #ffffff; margin-top: 28px; border-bottom: 1px solid #282c3c; padding-bottom: 8px; }
  p, li { color: #a0aec0; font-size: 15px; }
  ul { padding-left: 20px; }
  a { color: #6366f1; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .date { color: #718096; font-size: 13px; margin-bottom: 24px; }
</style>
"""

@router.get("/privacy", response_class=HTMLResponse)
def privacy_policy():
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>RAVISN — Privacy Policy</title>
    {HTML_STYLE}
</head>
<body>
    <div class="container">
        <h1>RAVISN Privacy Policy</h1>
        <div class="date">Last updated: August 7, 2026</div>

        <h2>Overview</h2>
        <p>RAVISN ("we," "us," "our") is based in Lahore, Punjab, Pakistan, and provides automated messaging technology that businesses ("Business Clients") use to communicate with their own customers over WhatsApp, Facebook Messenger, and Instagram Direct Messages. This policy explains what information we collect when you message a business that uses RAVISN's technology, how we use it, and what choices you have.</p>
        <p>RAVISN acts as a technology provider for Business Clients — we do not own or control the underlying WhatsApp number, Facebook Page, or Instagram account you're messaging, which remain the Business Client's own.</p>

        <h2>Information We Collect</h2>
        <p>When you send a message to a business that uses RAVISN's messaging agent, we may collect:</p>
        <ul>
            <li>Your platform identifier — your WhatsApp number, or a platform-assigned identifier for Facebook Messenger or Instagram</li>
            <li>Your display name, where the messaging platform makes it available to us</li>
            <li>The content of the messages you send, and the automated replies sent back to you</li>
            <li>Booking details you choose to share — such as your name, a contact method, a preferred date or time, and any notes — if you use the agent to request an appointment or booking</li>
        </ul>
        <p>We only collect this information through the conversation itself. We do not scrape, purchase, or receive your information from any other source.</p>

        <h2>How We Use This Information</h2>
        <ul>
            <li>To generate a relevant automatic reply, based on the specific Business Client's own knowledge base</li>
            <li>To keep a record of the conversation so replies stay consistent and the Business Client can review it</li>
            <li>To record any booking or appointment details you provide, so the Business Client can follow up with you directly</li>
        </ul>
        <p>We do not use your information for advertising, and we do not sell it to third parties.</p>

        <h2>How Messages Are Processed</h2>
        <p>To generate replies, message content is sent to a third-party AI language model provider (such as OpenAI or Google) solely to produce a reply to your specific message. We do not permit these providers to use your conversations to train their general-purpose models beyond what their own standard API terms allow.</p>

        <h2>Who Can Access Your Information</h2>
        <p>Only the specific Business Client you messaged, and RAVISN staff who operate the underlying platform, can access your conversation. RAVISN serves many different Business Clients; one business cannot see another business's customer conversations.</p>

        <h2>Data Retention</h2>
        <p>We retain your conversation and any booking information for as long as the Business Client's account with RAVISN remains active, or until a valid deletion request is processed, whichever comes first.</p>

        <h2>Your Rights and Data Deletion</h2>
        <p>You may request that we delete your conversation history and any booking information by contacting us at <a href="mailto:privacy@ravisn.com">privacy@ravisn.com</a> with the phone number or account handle you messaged from, and the name of the business you contacted. We will remove your data from our active systems within 30 days of a verified request, except where we are required to retain it for legal or regulatory reasons.</p>

        <h2>Security</h2>
        <p>We use reasonable technical measures — including encrypted connections and access controls limiting data to authorized staff and the relevant Business Client — to protect your information. No online system can be guaranteed completely secure.</p>

        <h2>Children's Privacy</h2>
        <p>Our services are not directed at children. Use of WhatsApp, Facebook Messenger, and Instagram is subject to each platform's own minimum age requirements, and we rely on those platforms' own safeguards in this respect.</p>

        <h2>Changes to This Policy</h2>
        <p>We may update this policy from time to time. The date at the top reflects the most recent revision. Continued use of the messaging service after a change constitutes acceptance of the updated policy.</p>

        <h2>Contact Us</h2>
        <p>RAVISN<br>Lahore, Punjab, Pakistan<br><a href="mailto:privacy@ravisn.com">privacy@ravisn.com</a><br><a href="https://ravisn.com" target="_blank">ravisn.com</a></p>
    </div>
</body>
</html>"""


@router.get("/terms", response_class=HTMLResponse)
def terms_conditions():
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>RAVISN — Terms and Conditions</title>
    {HTML_STYLE}
</head>
<body>
    <div class="container">
        <h1>RAVISN Terms and Conditions</h1>
        <div class="date">Last updated: August 7, 2026</div>

        <h2>1. Acceptance of These Terms</h2>
        <p>By creating an account or using RAVISN's messaging agent platform ("the Service"), you agree to these Terms and Conditions on behalf of yourself and the business you represent ("you," "your," "Business Client"). If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>RAVISN provides a platform that connects to WhatsApp, Facebook Messenger, and Instagram Direct Messages on your behalf, and uses an AI language model to automatically reply to your customers based on a knowledge base you create and maintain. The Service also lets you view conversations and capture booking information submitted by your customers.</p>

        <h2>3. Eligibility and Your Account</h2>
        <p>You must be at least 18 years old and authorized to act on behalf of the business you register. You are responsible for keeping your login credentials secure and for all activity under your account.</p>

        <h2>4. Connecting Your Messaging Channels</h2>
        <p>You may only connect WhatsApp numbers, Facebook Pages, and Instagram accounts that you own or are authorized to manage. Connecting a channel through RAVISN does not transfer ownership of that channel to RAVISN, and you may disconnect it at any time.</p>
        <p>Your use of WhatsApp, Facebook Messenger, and Instagram through RAVISN remains subject to Meta's own platform policies and terms of service. RAVISN is not responsible for any suspension, restriction, or ban of your account by Meta, whether related to your use of RAVISN or otherwise.</p>

        <h2>5. Your Knowledge Base and AI-Generated Replies</h2>
        <p>Replies sent to your customers are generated automatically by an AI language model, based only on the knowledge base content you provide. You are responsible for the accuracy and appropriateness of the content you add to your knowledge base. RAVISN does not guarantee that every AI-generated reply will be accurate, and recommends reviewing conversations periodically, especially for sensitive topics like pricing, medical, or legal matters.</p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
            <li>Send unlawful, harassing, deceptive, or harmful content to any person</li>
            <li>Send unsolicited bulk messages to people who have not opted in to hear from your business</li>
            <li>Violate the terms of service of WhatsApp, Meta, or any platform the Service connects to</li>
            <li>Attempt to interfere with, disrupt, or gain unauthorized access to the Service or other users' accounts</li>
        </ul>

        <h2>7. Fees and Payment</h2>
        <p>[RAVISN's specific pricing, billing cycle, and refund policy apply.]</p>

        <h2>8. Ownership of Your Data and Content</h2>
        <p>You retain ownership of your knowledge base content and any customer data collected through your connected channels. RAVISN retains ownership of the underlying software and platform. Our Privacy Policy explains how we handle customer data collected on your behalf.</p>

        <h2>9. Dependence on Third-Party Platforms</h2>
        <p>The Service depends on WhatsApp, Meta's Graph API, and third-party AI providers remaining available and unchanged. RAVISN is not liable for any disruption, feature change, or discontinuation caused by these third parties.</p>

        <h2>10. Service Availability</h2>
        <p>The Service is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted or error-free operation.</p>

        <h2>11. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, RAVISN will not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including lost business, lost messages, or missed bookings.</p>

        <h2>12. Termination</h2>
        <p>You may stop using the Service and disconnect your channels at any time. RAVISN may suspend or terminate accounts that violate these Terms, with notice where reasonably possible.</p>

        <h2>13. Changes to These Terms</h2>
        <p>We may update these Terms from time to time. Continued use of the Service after a change constitutes acceptance of the updated Terms.</p>

        <h2>14. Governing Law</h2>
        <p>These Terms are governed by the laws of Pakistan, with RAVISN based in Lahore.</p>

        <h2>15. Contact Us</h2>
        <p>RAVISN<br>Lahore, Punjab, Pakistan<br><a href="mailto:legal@ravisn.com">legal@ravisn.com</a><br><a href="https://ravisn.com" target="_blank">ravisn.com</a></p>
    </div>
</body>
</html>"""


@router.get("/data-deletion", response_class=HTMLResponse)
def data_deletion():
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>RAVISN — Data Deletion Instructions</title>
    {HTML_STYLE}
</head>
<body>
    <div class="container">
        <h1>RAVISN Data Deletion Instructions</h1>
        <div class="date">Last updated: August 7, 2026</div>

        <p>If you have messaged a business that uses RAVISN's messaging agent (over WhatsApp, Facebook Messenger, or Instagram), you can request that we delete the data associated with your conversation — including your messages, your platform identifier, and any booking details you shared.</p>

        <h2>How to Request Deletion</h2>
        <p>Send an email to <a href="mailto:privacy@ravisn.com">privacy@ravisn.com</a> with:</p>
        <ul>
            <li>The phone number or account handle you messaged from</li>
            <li>The name of the business you contacted (if known)</li>
            <li>A short statement that you're requesting deletion of your data</li>
        </ul>
        <p>We may ask you to confirm you're the person associated with that phone number or account, to make sure we're deleting the right data.</p>

        <h2>What Happens Next</h2>
        <p>We will locate and permanently delete your conversation history and any booking information from our active systems within 30 days of a verified request. We will confirm by email once this is complete.</p>

        <h2>What We Cannot Delete</h2>
        <p>RAVISN does not control the underlying WhatsApp, Facebook, or Instagram platforms. Copies of your messages may still exist within Meta's own systems, subject to Meta's own privacy practices. We also may retain limited records where required by law (for example, financial records related to a completed transaction), which we will disclose to you if this applies to your request.</p>

        <h2>Related</h2>
        <p>See our <a href="/privacy">Privacy Policy</a> for more on how we handle your information generally.</p>

        <h2>Contact</h2>
        <p>RAVISN<br>Lahore, Punjab, Pakistan<br><a href="mailto:privacy@ravisn.com">privacy@ravisn.com</a></p>
    </div>
</body>
</html>"""
