import PolicyLayout from "../../components/PolicyLayout";

const sections = [
  {
    heading: "Client Referrals",
    body: "Associates may introduce prospective clients to BIZPOLE and communicate their requirements for relevant services. Associates shall provide accurate information and shall not guarantee acceptance of an assignment, government approval, registration or any other service outcome.",
  },
  {
    heading: "Communication and Coordination",
    body: [
      "Associates shall ordinarily act as the primary communication link between referred clients and BIZPOLE. They shall relay client requirements, documents, questions and updates accurately and promptly and communicate BIZPOLE’s responses without alteration or misrepresentation.",
      "BIZPOLE shall ordinarily communicate through the Associate and shall make direct contact with a referred client only where reasonably necessary for the purposes specified in the Terms and Conditions. Wherever reasonably practicable, the Associate shall be informed of such direct communication.",
    ],
  },
  {
    heading: "Confidentiality and Client Information",
    body: [
      "Associates shall handle client information securely, share only information necessary for the relevant referral or service request, and ensure that they are authorised to provide such information.",
      "Client information shall not be used for unrelated purposes or disclosed to unauthorised persons.",
    ],
  },
  {
    heading: "Professional Conduct",
    body: "Associates shall act honestly and professionally, avoid misleading representations, disclose relevant conflicts of interest and promptly inform BIZPOLE of complaints, disputes or material changes in a referred client’s requirements.",
  },
  {
    heading: "Referral Fees and Commission",
    body: "Referral fees, commissions or other remuneration shall be payable only in accordance with a separate written agreement or written confirmation between BIZPOLE and the Associate. The applicable terms, eligibility conditions and payment arrangements shall be determined by that agreement.",
  },
  {
    heading: "Discontinuation of the Arrangement",
    body: "The associate arrangement may be discontinued in accordance with the applicable agreement between the parties. Upon discontinuation, the Associate shall cease using the Portal and shall return, transfer or securely delete confidential BIZPOLE and client information as instructed, subject to applicable legal requirements.",
  },
  {
    heading: "Contact",
    body: "For questions relating to this Policy, contact:",
    contact: true,
  },
];

export default function AssociateReferralConductPolicy() {
  return <PolicyLayout title="Associate Referral and Conduct Policy" sections={sections} />;
}
