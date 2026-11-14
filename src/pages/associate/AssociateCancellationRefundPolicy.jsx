import PolicyLayout from "../../components/PolicyLayout";

const sections = [
  {
    heading: "Cancellation Requests",
    body: "Cancellation or refund requests for services availed through the BIZPOLE ONE Associate Portal may be submitted by the client or by the Associate on the client’s behalf through the available communication channels of BIZPOLE. Each request will be reviewed based on the service involved, the work completed and the applicable agreement.",
  },
  {
    heading: "Work Already Started or Completed",
    body: "Where work has already commenced or been completed, the refund, if any, may be adjusted to account for the work performed, costs incurred and obligations undertaken, subject to applicable law and the agreed service terms.",
  },
  {
    heading: "Government and Third-Party Charges",
    body: "Government fees, statutory charges and payments made to third parties may be non-refundable where the relevant authority or provider does not permit a refund. Any refundable amount will be handled in accordance with the applicable rules.",
  },
  {
    heading: "Delays, Rejections and Duplicate Payments",
    body: "Delays or rejection by a government authority or third party do not automatically entitle a client to a refund where the service has been performed as agreed. Duplicate or excess payments will be reviewed and, once verified, refunded as appropriate.",
  },
  {
    heading: "Referral Fees and Commission",
    body: "Where a client payment is cancelled or refunded, in full or in part, any referral fee or commission linked to that payment may be adjusted, withheld or recovered in accordance with the separate written agreement or written confirmation between BIZPOLE and the Associate.",
  },
  {
    heading: "Review and Contact",
    body: "Refund requests will be reviewed within a reasonable period, and approved refunds will be processed to the original payer through the applicable payment method, subject to payment-provider timelines and applicable law. For cancellation or refund assistance, contact:",
    contact: true,
  },
];

export default function AssociateCancellationRefundPolicy() {
  return <PolicyLayout title="Cancellation and Refund Policy" sections={sections} />;
}
