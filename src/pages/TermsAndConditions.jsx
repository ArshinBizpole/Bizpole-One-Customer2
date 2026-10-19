import PolicyLayout from "../components/PolicyLayout";

const sections = [
  {
    heading: "Acceptance and Purpose",
    body: "By accessing or using BIZPOLE ONE (“App”), you agree to these Terms and Conditions. The App enables customers to view the progress of services entrusted to BIZPOLE, receive updates, submit requested information and documents, and communicate with BIZPOLE.",
  },
  {
    heading: "Account and Customer Responsibilities",
    body: "You must provide accurate and up-to-date information, keep your login credentials confidential, and submit complete documents and information within the requested time. You are responsible for the accuracy and authenticity of the information and documents you provide.",
  },
  {
    heading: "Services and Timelines",
    body: "The App provides information about service progress and does not itself guarantee completion, approval or acceptance of any application by a government authority, regulator, bank or other third party. Timelines may depend on the customer's cooperation, applicable procedures and third-party decisions.",
  },
  {
    heading: "Fees, Cancellation and Refunds",
    body: "Service fees, government charges and other applicable costs shall be communicated separately or as agreed for the relevant service. Cancellation and refund requests will be handled in accordance with BIZPOLE’s Cancellation and Refund Policy and applicable law.",
  },
  {
    heading: "Intellectual Property and Prohibited Use",
    body: "The App, its branding, design and content are owned by or licensed to BIZPOLE and may not be copied, modified or used without permission, except as permitted by law. You must not misuse the App, submit misleading information, attempt unauthorised access or interfere with its operation.",
  },
  {
    heading: "Availability and Liability",
    body: "We endeavour to keep the App available and information updated but do not guarantee uninterrupted access or error-free operation. To the extent permitted by law, BIZPOLE shall not be responsible for delays or decisions beyond its reasonable control. Nothing in these Terms excludes liability that cannot legally be excluded.",
  },
  {
    heading: "Suspension and Changes",
    body: "We may suspend or restrict access where reasonably necessary for security, misuse, maintenance or legal compliance. We may update these Terms from time to time, and the revised version will be published in the App.",
  },
  {
    heading: "Governing Law and Contact",
    body: "These Terms shall be governed by the laws of India, subject to applicable law. For assistance or complaints, contact:",
    contact: true,
  },
];

export default function TermsAndConditions() {
  return <PolicyLayout title="Terms and Conditions" sections={sections} />;
}
