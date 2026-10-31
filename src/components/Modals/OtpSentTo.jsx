// "We have sent a one time password to your registered ..." line for OTP screens.
// `info` is the send-OTP response: { emailSent, smsSent, maskedMobile }. The masked
// mobile is shown only when the server says the SMS actually went out.
export default function OtpSentTo({ info, className = "" }) {
  const known = info && typeof info.emailSent === "boolean";
  const channels = !known
    ? "Email and Mobile Number"
    : info.emailSent && info.smsSent
      ? "Email and Mobile Number"
      : info.smsSent
        ? "Mobile Number"
        : "Email";
  const maskedMobile = info?.smsSent ? info.maskedMobile : null;

  return (
    <span className={className}>
      We have sent a one time password to your registered{" "}
      <span className="font-bold text-gray-800">{channels}</span>
      {maskedMobile && (
        <>
          <br />
          <span className="text-gray-500">Mobile: </span>
          <span className="font-semibold text-gray-800">+91 {maskedMobile}</span>
        </>
      )}
    </span>
  );
}
