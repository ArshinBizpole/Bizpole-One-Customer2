import PolicyLayout from "../../components/PolicyLayout";

const sections = [
  {
    heading: "Acceptance and Purpose",
    body: "By accessing or using BIZPOLE ONE Associate Portal (“Portal”), you agree to these Terms and Conditions. The Portal enables authorised associates to refer clients to BIZPOLE, submit relevant client information, coordinate communications, receive referral updates and facilitate the delivery of services requested by referred clients.",
  },
  {
    heading: "Role of the Associate",
    body: [
      "The Associate shall act as an intermediary between the client and BIZPOLE by introducing clients, communicating their requirements, facilitating the exchange of information and documents, and relaying service-related updates.",
      "Unless separately authorised in writing, the Associate shall not enter into contracts, make binding commitments, approve fees, guarantee outcomes or otherwise bind BIZPOLE.",
    ],
  },
  {
    heading: "Client Communication and Non-Circumvention",
    body: [
      "The Associate shall ordinarily serve as the primary communication channel between the client and BIZPOLE. Routine communications concerning client requirements, service requests, quotations, document collection, progress updates and other service-related matters shall ordinarily be routed through the Associate.",
      "BIZPOLE shall not directly contact or communicate with a client introduced by the Associate in the ordinary course of business without the Associate’s knowledge, except where direct communication is reasonably necessary for identity verification, obtaining consent or documents, fulfilling statutory or regulatory requirements, addressing a specific client request, resolving a service-related issue or complying with applicable law.",
      "Where direct communication is necessary, BIZPOLE shall, wherever reasonably practicable, inform the Associate and keep the Associate involved in the communication process.",
      "Neither party shall knowingly bypass the other for the purpose of circumventing an agreed referral fee, commission or other contractual entitlement. Any such entitlement shall be governed by the separate written agreement between BIZPOLE and the Associate.",
    ],
  },
  {
    heading: "Accuracy and Responsibilities",
    body: [
      "The Associate shall provide accurate and complete information, communicate client requirements promptly, ensure appropriate authorisation for sharing client information and correct any errors brought to their attention.",
      "The Associate shall not misrepresent BIZPOLE’s services, fees, timelines, approvals or likely outcomes, or make unauthorised commitments on BIZPOLE’s behalf.",
    ],
  },
  {
    heading: "Fees and Commission",
    body: [
      "Any referral fee, commission, remuneration or reimbursement payable to the Associate shall be governed by a separate written agreement or written confirmation specifying the applicable terms and conditions.",
      "Use of the Portal or referral of a client alone shall not create an automatic entitlement to commission or other payment.",
      "Fees payable by clients for services provided by BIZPOLE shall be governed by the applicable service terms communicated or agreed for the relevant engagement.",
    ],
  },
  {
    heading: "Confidentiality and Data Handling",
    body: [
      "The Associate shall maintain the confidentiality of all non-public client information, documents, pricing, business information and communications received through the Portal or in connection with the referral arrangement.",
      "Such information shall be used only for authorised referral and coordination purposes and shall not be disclosed to unauthorised persons or used for personal gain.",
      "Any suspected loss, unauthorised disclosure or misuse of confidential information shall be promptly reported to BIZPOLE.",
    ],
  },
  {
    heading: "Intellectual Property and Prohibited Use",
    body: [
      "The Portal, it’s branding, design and content are owned by or licensed to BIZPOLE and shall not be copied, modified, misused or commercially exploited without permission, except as permitted by law.",
      "Associates shall not attempt unauthorised access, submit misleading information, interfere with Portal operations or use the Portal for unlawful purposes.",
    ],
  },
  {
    heading: "Availability, Suspension and Liability",
    body: [
      "BIZPOLE shall make reasonable efforts to maintain the availability of the Portal but does not guarantee uninterrupted access or error-free operation.",
      "BIZPOLE may suspend or restrict access where reasonably necessary for security, misuse, maintenance or legal compliance. To the extent permitted by law, BIZPOLE shall not be responsible for delays or third-party decisions beyond its reasonable control. Nothing in these Terms excludes liability that cannot legally be excluded.",
    ],
  },
  {
    heading: "Termination and Changes",
    body: [
      "The associate arrangement may be discontinued in accordance with any separate agreement between the parties. Upon termination, the Associate shall cease using the Portal and return, transfer or securely delete confidential information as reasonably instructed, subject to applicable legal retention requirements.",
      "BIZPOLE may revise these Terms from time to time and publish the revised version in the Portal or otherwise communicate the changes to associates.",
    ],
  },
  {
    heading: "Governing Law and Contact",
    body: [
      "These Terms shall be governed by the laws of India, subject to applicable law.",
      "For assistance or complaints, contact:",
    ],
    contact: true,
  },
];

export default function AssociateTermsAndConditions() {
  return <PolicyLayout title="Terms and Conditions" sections={sections} />;
}
