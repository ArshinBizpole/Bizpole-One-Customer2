import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import AssociateApi from "../../api/AssociateApi";
import { setSecureItem } from "../../utils/secureStorage";
import { notifyTokenSet } from "../../utils/authSession";
import { useNavigate } from "react-router-dom";

const PartnerLoginModal = ({ isOpen, onClose, onSwitchToSignup }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email Input, 2: OTP Input
    const [email, setEmail] = useState("");
    const [otpValues, setOtpValues] = useState(["", "", "", ""]);
    const [timer, setTimer] = useState(30);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");
    const [isHovered, setIsHovered] = useState(false);

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

    const handleNextStep = async (e) => {
        if (e) e.preventDefault();
        if (!email.trim()) {
            setError("Email address is required");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const response = await AssociateApi.requestAssociateEmailOtp(email);
            if (response.success) {
                setStep(2);
                setTimer(30);
                setOtpValues(["", "", "", ""]);
            } else {
                setError(response.message || "Failed to send OTP");
            }
        } catch (error) {
            console.error("Associate OTP request error:", error);
            setError(error.response?.data?.message || "User not found or error sending OTP");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOtpChange = async (index, value) => {
        if (value.length <= 1) {
            const newOtpValues = [...otpValues];
            newOtpValues[index] = value;
            setOtpValues(newOtpValues);

            // Auto focus next input
            if (value && index < 3) {
                const nextInput = document.getElementById(`associate-otp-${index + 1}`);
                nextInput?.focus();
            }

            // If all OTP fields are filled, verify OTP
            if (index === 3 && value && newOtpValues.every((v) => v.length === 1)) {
                setIsVerifying(true);
                try {
                    const otp = newOtpValues.join("");
                    const response = await AssociateApi.verifyAssociateEmailOtp(email, otp);

                    if (response.success) {
                        // Store token and user
                        if (response.token && response.user) {
                            localStorage.setItem('partnerToken', response.token); // Store partner token distinctly
                            notifyTokenSet();
                            localStorage.setItem('EmployeeID', response.user.EmployeeID);
                            localStorage.setItem('FranchiseeID', response.user.FranchiseeID);
                            localStorage.setItem('AssociateID', response.user.id);
                            setSecureItem("partnerUser", response.user); // Store partner user distinctly
                        }

                        onClose();
                        navigate("/associate/dashboard");
                    } else {
                        setError(response.message || "Invalid OTP");
                    }
                } catch (err) {
                    setError(err.response?.data?.message || "OTP verification failed");
                } finally {
                    setIsVerifying(false);
                }
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            const prevInput = document.getElementById(`associate-otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleResend = () => {
        if (timer === 0) {
            handleNextStep();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative p-8 min-h-[500px] flex flex-col justify-center"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-gray-400" />
                </button>

                <div className="flex flex-col items-center w-full">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="w-full flex flex-col items-center"
                            >
                                <h2 className="text-3xl font-extrabold text-[#1e293b] mb-10 mt-4">Sign In</h2>

                                <div className="w-full flex flex-col gap-2 mb-8">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error) setError("");
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                                        placeholder="abc@xyz.com"
                                        className={`w-full px-6 py-4 rounded-xl border ${error ? 'border-red-400 focus:ring-red-100' : 'border-gray-200 focus:ring-yellow-100 focus:border-yellow-400'} focus:outline-none focus:ring-4 transition-all placeholder:text-gray-300 text-lg`}
                                    />
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-1 text-xs text-red-500 ml-1 mt-1"
                                        >
                                            <AlertCircle className="w-3 h-3" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Animated Yellow Button */}
                                <motion.div
                                    className="relative bg-yellow-400 rounded-full w-24 h-12 cursor-pointer shadow-lg mb-8"
                                    onMouseEnter={() => setIsHovered(true)}
                                    onMouseLeave={() => setIsHovered(false)}
                                    onClick={handleNextStep}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <motion.div
                                        className="absolute top-1 left-1 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center font-bold"
                                        animate={{ x: isHovered ? 48 : 0 }}
                                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-black" />
                                        ) : (
                                            <ArrowRight className="w-5 h-5 text-black" />
                                        )}
                                    </motion.div>
                                </motion.div>

                                <p className="text-slate-500 text-center mb-10 max-w-[250px] leading-relaxed text-sm">
                                    We Will send you a one time password on this <span className="font-bold text-slate-800">Email Address</span>
                                </p>

                                <div className="text-slate-600 font-medium">
                                    Don't Have An Account ?{" "}
                                    <button
                                        type="button"
                                        onClick={onSwitchToSignup}
                                        className="text-slate-800 font-extrabold underline decoration-2 underline-offset-4 hover:text-yellow-600 transition-colors"
                                    >
                                        Sign up
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full flex flex-col items-center"
                            >
                                <h2 className="text-3xl font-extrabold text-[#1e293b] mb-4 mt-4">OTP Verification</h2>

                                <p className="text-center text-slate-500 mb-8 leading-relaxed text-sm">
                                    We Will send you a one time password on this <br />
                                    <span className="font-bold text-slate-800">Email Address</span> <br />
                                    <span className="font-semibold text-slate-800 truncate max-w-[300px] inline-block">{email}</span>
                                </p>

                                <div className="flex gap-3 mb-8">
                                    {[0, 1, 2, 3].map((index) => (
                                        <input
                                            key={index}
                                            id={`associate-otp-${index}`}
                                            type="text"
                                            maxLength="1"
                                            value={otpValues[index]}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-14 h-14 border-2 border-yellow-400 rounded-full text-center text-xl font-bold outline-none focus:ring-4 focus:ring-yellow-100 transition-all border-solid"
                                        />
                                    ))}
                                </div>

                                <div className="text-lg font-mono text-slate-600 mb-4">
                                    {`00:${timer.toString().padStart(2, "0")}`}
                                </div>

                                <p className="text-xs text-slate-500 mb-8">
                                    Do not receive OTP ?{" "}
                                    <button
                                        onClick={handleResend}
                                        disabled={timer > 0}
                                        className="text-yellow-500 font-bold hover:text-yellow-600 disabled:text-slate-300 disabled:cursor-not-allowed"
                                    >
                                        Resend OTP
                                    </button>
                                </p>

                                {/* Back Button to Email Step */}
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-sm text-[#1e293b] font-bold hover:underline mb-4"
                                >
                                    Change Email
                                </button>

                                {isVerifying && (
                                    <div className="flex items-center gap-2 text-yellow-600 font-semibold mb-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Verifying...
                                    </div>
                                )}
                                {error && (
                                    <div className="flex items-center gap-1 text-xs text-red-500 font-medium mb-4">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default PartnerLoginModal;
