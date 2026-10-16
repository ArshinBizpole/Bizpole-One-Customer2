import PolicyLayout from "../../components/PolicyLayout";

const sections = [
  {
    heading: "Introduction",
    body: "BIZPOLE ONE Associate Portal (“Portal”) is operated by BIZPOLE BUSINESS SOLUTIONS PRIVATE LIMITED (“BIZPOLE”, “we”, “us” or “our”). This Privacy Policy explains how we collect, use, store and share information when associates use the Portal to refer clients to BIZPOLE and coordinate related communications.",
  },
  {
    heading: "Information We Collect",
    body: "We may collect associate’s names, contact details, account information, referral records, communications and technical information relating to Portal usage. We may also receive client names, contact details, business information, documents and service requirements submitted by associates for referral or service coordination purposes.",
  },
  {
    heading: "Use of Information",
    body: "We use the information to manage associate accounts, record and track client referrals, coordinate communications, process service requests, maintain business records and comply with applicable legal or regulatory obligations.",
  },
  {
    heading: "Sharing and Security",
    body: [
      "Information may be accessed by authorised BIZPOLE personnel and shared with professional advisers, service providers, government departments or regulators where necessary for the relevant services or legal compliance.",
      "Associates must maintain the confidentiality of client and BIZPOLE information and use it only for authorised purposes. BIZPOLE takes reasonable measures to protect information against unauthorised access, loss or misuse.",
    ],
  },
  {
    heading: "Retention and Rights",
    body: "Information will be retained for as long as reasonably necessary for referral management, service coordination, record-keeping and legal compliance. Subject to applicable law, requests for access to or correction of personal information may be submitted to BIZPOLE using the contact details below.",
  },
  {
    heading: "Contact Us",
    contact: true,
  },
];

export default function AssociatePrivacyPolicy() {
  return <PolicyLayout title="Privacy Policy" showLastUpdated sections={sections} />;
}
