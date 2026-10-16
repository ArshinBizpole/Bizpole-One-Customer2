import PolicyLayout from "../components/PolicyLayout";

const sections = [
  {
    heading: "Introduction",
    body: "BIZPOLE ONE (“App”) is operated by BIZPOLE BUSINESS SOLUTIONS PRIVATE LIMITED (“BIZPOLE”, “we”, “us” or “our”). This Privacy Policy explains how we collect, use, store and share information when you use the App.",
  },
  {
    heading: "Information We Collect",
    body: "We may collect your name, contact details, business information, identity and supporting documents, service-related records, communications, and technical information relating to your use of the App.",
  },
  {
    heading: "Use of Information",
    body: "We use your information to provide and manage services entrusted to BIZPOLE, display work progress, send updates, obtain required documents or information, communicate with you, maintain records, and meet legal or regulatory obligations.",
  },
  {
    heading: "Sharing and Security",
    body: "We may share relevant information with authorised employees, professional advisers, service providers, government departments or regulators where necessary for providing services or complying with law. We take reasonable measures to protect information against unauthorised access, loss or misuse.",
  },
  {
    heading: "Retention and Your Rights",
    body: "We retain information for as long as reasonably necessary for service delivery, legal compliance and record-keeping. Subject to applicable law, you may request access, correction or deletion of your information by contacting us. Certain information may need to be retained where legally required.",
  },
  {
    heading: "Contact Us",
    contact: true,
  },
];

export default function PrivacyPolicy() {
  return <PolicyLayout title="Privacy Policy" showLastUpdated sections={sections} />;
}
