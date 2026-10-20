
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { loginWithPhone, signupWithPhone, verifyOtp } from "../../api/AuthApi";
import { getAllStates } from "../../api/States";
import { setSecureItem } from "../../utils/secureStorage";
import { notifyTokenSet } from "../../utils/authSession";
import { clearReferralToken, getReferralToken } from "../../utils/referralAttribution";
import { languagesForState, languageForState } from "../../utils/stateLanguages";

// Add a mode state for switching between sign-in and sign-up

// initialValue: prefill the phone/email box. onSuccess(tokenData): run after
// sign-in instead of the default redirect to the dashboard (e.g. an
// application flow that should stay on its current step). onSignup: replaces the
// "Sign up" link's default jump to /startbusiness (e.g. so an application flow
// can switch to its own sign-up form without leaving the current step).
const SigninModal = ({ isOpen = true, onClose = () => { }, initialValue = "", initialMode = "signin", onSuccess, onSignup }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode === "signup" ? "signup" : "signin"); // 'signin' or 'signup'

  // Re-apply the requested mode each time the modal is opened (e.g. "Create an account"
  // from a referral landing page opens straight into sign-up).
  useEffect(() => {
    if (isOpen) setMode(initialMode === "signup" ? "signup" : "signin");
  }, [isOpen, initialMode]);
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [signedMessage, setSignedMessage] = useState("");
  const [inputValue, setInputValue] = useState(initialValue);
  const [isHovered, setIsHovered] = useState(false);
  const [timer, setTimer] = useState(30);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const modalContentRef = useRef(null);
  // In-modal message dialog (replaces browser alert()). afterClose runs on OK.
  const [notice, setNotice] = useState(null); // { title, message, afterClose? }
  const showNotice = (title, message, afterClose) => setNotice({ title, message, afterClose });
  const closeNotice = () => {
    const after = notice?.afterClose;
    setNotice(null);
    if (after) after();
  };

  // For sign-up extra fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  // The customer's state — saved on their account and used to pick the
  // franchisee serving it (instead of everyone defaulting to Kerala).
  const [signupState, setSignupState] = useState("");
  // Preferred language — with the state, routes their Lead to a BDE who
  // speaks it. Follows the State (stateLanguages.js), as in the application form.
  const [signupLanguage, setSignupLanguage] = useState("");
  const [stateOptions, setStateOptions] = useState([]);
  useEffect(() => {
    if (!isOpen || mode !== "signup" || stateOptions.length) return;
    getAllStates()
      .then((rows) => setStateOptions((Array.isArray(rows) ? rows : []).map((r) => r.state_name).filter(Boolean)))
      .catch(() => {});
  }, [isOpen, mode, stateOptions.length]);

  // Timer countdown for OTP
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);


  // Next step handler for sign-in/sign-up
  // Request OTP for both sign-in and sign-up
  const handleNextStep = async () => {
    if (mode === "signup") {
      if (!signupName || !signupEmail || !inputValue || !signupState || !signupLanguage) {
        showNotice("Missing details", "Please fill in your name, email, state, preferred language and phone number to sign up.");
        return;
      }
    } else {
      if (!inputValue) {
        showNotice("Missing details", "Please enter your email address or phone number.");
        return;
      }
    }
    try {
      if (mode === "signup") {
        // Referral scan token (if any, unexpired) rides along; the server attributes the
        // signup from it and ignores it if invalid — it never blocks signup.
        await signupWithPhone(signupName, signupEmail, inputValue, getReferralToken(), signupState, signupLanguage);
      } else {
        await loginWithPhone(inputValue);
      }
      setStep(2);
    } catch (err) {
      showNotice("Couldn't send OTP", err?.message || "Failed to send OTP. Please try again.");
    }
  };

  // Switch between sign-in and sign-up
  const handleSwitchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setStep(1);
    setInputValue("");
    setOtpValues(["", "", "", ""]);
    setSignupName("");
    setSignupEmail("");
    setSignupState("");
    setSignupLanguage("");
  };

  const handleBackStep = () => {
    setStep(1);
  };

  // Resend via the login endpoint for both modes — after sign-up the customer row
  // already exists, so re-calling sign-up would 409. Server enforces a 30s cooldown.
  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await loginWithPhone(inputValue);
      setOtpValues(["", "", "", ""]);
      setTimer(30);
    } catch (err) {
      showNotice("Couldn't resend OTP", err?.message || "Failed to resend OTP. Please try again.");
    }
  };

  // OTP input handler and verification
  const handleOtpChange = async (index, value) => {
    if (value.length <= 1) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = value;
      setOtpValues(newOtpValues);
      // Auto focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
      // If all OTP fields are filled, verify OTP
      if (index === 3 && value && newOtpValues.every((v) => v.length === 1)) {
        setIsVerifying(true);
        try {
          const otp = newOtpValues.join("");
          const tokenData = await verifyOtp(inputValue, otp);
          console.log(tokenData, "token data1");

          // Store token and user in localStorage
          if (tokenData && tokenData.token) {
            console.log(tokenData, "token");
            localStorage.setItem('token', tokenData.token);
            notifyTokenSet();
            if (mode === "signup") clearReferralToken();
            setSignedMessage("Signed in successfully!");
          }
          if (tokenData && tokenData.user) {
            setSecureItem('user', JSON.stringify(tokenData.user));
          }

          setStep(3);
          console.log("Token Data:", tokenData);
          setTimeout(() => {
            if (onSuccess) {
              onSuccess(tokenData);
              return;
            }
            onClose();
            navigate("/dashboard/bizpoleone");
          }, 1200); // short delay for user feedback
        } catch (err) {
          // Clear the boxes and put the cursor back in the first one once OK is pressed.
          showNotice(
            "Verification failed",
            err?.message === "Invalid OTP or phone number"
              ? "The OTP you entered is incorrect or has expired. Please check it and try again."
              : err?.message || "OTP verification failed. Please try again.",
            () => {
              setOtpValues(["", "", "", ""]);
              setTimeout(() => document.getElementById("otp-0")?.focus(), 0);
            },
          );
        } finally {
          setIsVerifying(false);
        }
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        ref={modalContentRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {/* Close button */}
        <motion.button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.button>


        <AnimatePresence mode="wait">
          {/* Step 1 - Email / Phone (Sign In or Sign Up) */}
          {step === 1 && (
            <motion.div
              key="step1"
              className="flex flex-col items-center gap-6 w-full"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.4 }}
            >
              <motion.h2
                className="text-2xl font-bold text-gray-800 mb-2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {mode === "signin" ? "Sign In" : "Sign Up"}
              </motion.h2>

              {/* For sign-up, show name and email fields */}
              {mode === "signup" && (
                <>
                  <motion.div
                    className="w-full"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                    />
                  </motion.div>
                  <motion.div
                    className="w-full"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.18 }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="abc@xyz.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                    />
                  </motion.div>
                  <motion.div
                    className="w-full"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.19 }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      State
                    </label>
                    <select
                      value={signupState}
                      onChange={(e) => {
                        setSignupState(e.target.value);
                        setSignupLanguage((cur) => languageForState(e.target.value, cur).toLowerCase());
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                    >
                      <option value="">Select your state</option>
                      {stateOptions.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </motion.div>
                  <motion.div
                    className="w-full"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.195 }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      Preferred Language
                    </label>
                    <select
                      value={signupLanguage}
                      onChange={(e) => setSignupLanguage(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                    >
                      <option value="">Select your language</option>
                      {languagesForState(signupState).map((l) => (
                        <option key={l} value={l.toLowerCase()}>{l}</option>
                      ))}
                    </select>
                  </motion.div>
                </>
              )}

              <motion.div
                className="w-full"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  {mode === "signin" ? "Email Address / Phone Number" : "Phone Number"}
                </label>
                <input
                  type="text"
                  placeholder={mode === "signin" ? "abc@xyz.com" : "Enter your phone number"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNextStep();
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                />
              </motion.div>

              {/* Next Button */}
              <motion.div
                className="relative bg-yellow-400 rounded-full w-20 h-12 cursor-pointer shadow-lg transition-all duration-300 hover:shadow-xl"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleNextStep}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute top-1 left-1 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
                  animate={{ x: isHovered ? 32 : 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200 }}
                >
                  <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    animate={{ rotate: isHovered ? 0 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path
                      d="M5 12h14m-7-7l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </motion.div>
              </motion.div>

              <motion.p
                className="text-sm text-center text-gray-600 leading-relaxed"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {mode === "signin"
                  ? (<>
                    We Will send you a one time password <br />
                    on this <span className="font-bold text-gray-800">Mobile Number</span>
                  </>)
                  : (<>
                    Please enter your details to sign up. <br />
                    We will send an OTP to your email and mobile number.
                  </>)}
              </motion.p>

              <motion.p
                className="text-sm text-gray-600"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {mode === "signin" ? (
                  <>
                    Don't Have An Account ? {" "}
                    <span
                      className="font-semibold underline cursor-pointer text-gray-800 hover:text-yellow-600 transition-colors"
                      onClick={() => (onSignup ? onSignup() : navigate("/startbusiness"))}
                    >
                      Sign up
                    </span>
                  </>
                ) : (
                  <>
                    Already have an account? {" "}
                    <span
                      className="font-semibold underline cursor-pointer text-gray-800 hover:text-yellow-600 transition-colors"
                      onClick={handleSwitchMode}
                    >
                      Sign in
                    </span>
                  </>
                )}
              </motion.p>
            </motion.div>
          )}

          {/* Step 2 - OTP */}
          {step === 2 && (
            <motion.div
              key="step2"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <motion.h2
                className="text-2xl font-bold text-gray-800 mb-2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                OTP Verification
              </motion.h2>

              <motion.p
                className="text-center text-gray-600 leading-relaxed"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                We have sent a one time password to your registered{" "}
                <span className="font-bold text-gray-800">Email and Mobile Number</span> for <br />
                <span className="font-semibold text-gray-800">
                  {inputValue}
                </span>
              </motion.p>

              {/* OTP inputs */}
              <motion.div
                className="flex gap-3"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, staggerChildren: 0.1 }}
              >
                {[0, 1, 2, 3].map((index) => (
                  <motion.input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength="1"
                    value={otpValues[index]}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isVerifying}
                    className="w-14 h-14 border-2 border-yellow-400 rounded-full text-center text-xl font-semibold outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 transition-all"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                  />
                ))}
              </motion.div>

              {/* Timer */}
              <motion.p
                className="text-lg font-mono text-gray-600"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {`00:${timer.toString().padStart(2, "0")}`}
              </motion.p>

              <motion.p
                className="text-sm text-gray-600"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Didn't receive the OTP?{" "}
                {timer > 0 ? (
                  <span className="text-gray-400 font-semibold">Resend in {timer}s</span>
                ) : (
                  <span
                    className="text-yellow-500 font-semibold cursor-pointer hover:text-yellow-600 transition-colors"
                    onClick={handleResend}
                  >
                    Resend OTP
                  </span>
                )}
              </motion.p>

              {/* Back Button */}
              <motion.div
                className="relative bg-yellow-400 rounded-full w-20 h-12 cursor-pointer shadow-lg transition-all duration-300 hover:shadow-xl"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleBackStep}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute top-1 left-1 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
                  animate={{ x: isHovered ? 32 : 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200 }}
                >
                  <motion.svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    animate={{ rotate: isHovered ? 0 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </motion.div>
              </motion.div>
              {isVerifying && <div className="text-yellow-500 font-semibold mt-2">Verifying...</div>}
            </motion.div>
          )}

          {/* Step 3 - Signed in message */}
          {step === 3 && (
            <motion.div
              key="step3"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <motion.h2
                className="text-2xl font-bold text-green-600 mb-2"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {signedMessage || "Signed in!"}
              </motion.h2>
              <div className="text-gray-700">You are now authenticated. Check the console for your token.</div>
              <button
                className="mt-4 px-6 py-2 bg-yellow-400 rounded-full font-semibold text-gray-900 hover:bg-yellow-500 transition"
                onClick={onClose}
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message dialog — sits over the modal content instead of a browser alert() */}
        <AnimatePresence>
          {notice && (
            <motion.div
              key="notice"
              className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px] p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="signin-notice-title"
                aria-describedby="signin-notice-message"
                className="w-full max-w-xs bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col items-center text-center"
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 10 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 7.5v5.5M12 16.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 id="signin-notice-title" className="text-lg font-bold text-gray-800">{notice.title}</h3>
                <p id="signin-notice-message" className="mt-1 text-sm text-gray-600 leading-relaxed">{notice.message}</p>
                <button
                  autoFocus
                  onClick={closeNotice}
                  onKeyDown={(e) => { if (e.key === "Escape") closeNotice(); }}
                  className="mt-5 w-full py-2.5 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-semibold transition-colors"
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SigninModal;
