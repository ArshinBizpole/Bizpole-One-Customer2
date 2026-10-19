import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import {
    ArrowRight,
    Check,
    CircleDollarSign,
    Monitor,
    Globe,
    Users,
    FileText,
    ClipboardCheck,
    BookOpen,
    TrendingUp,
    ShieldCheck,
    Headphones,
    Plus,
    Minus,
    Triangle,
    Star,
} from "lucide-react";
import PartnerSignupModal from "../components/Modals/PartnerSignupModal";
import PartnerLoginModal from "../components/Modals/PartnerLoginModal";
import heroImage from "../assets/images/partners-hero.png";

const SUCCESS_IMAGE = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&q=80";

const trustBadges = [
    { icon: ShieldCheck, label: "Trusted by Businesses" },
    { icon: TrendingUp, label: "Proven Growth Model" },
    { icon: Headphones, label: "Dedicated Partner Support" },
];

const benefits = [
    {
        icon: CircleDollarSign,
        title: "Grow Your Revenue",
        description: "Unlock new income opportunities by offering Bizpole's trusted corporate and compliance solutions to more businesses.",
        offset: "md:mt-10",
    },
    {
        icon: Monitor,
        title: "Powerful Products",
        description: "Get access to innovative products, automated marketing collateral, and in-depth training to help you succeed effortlessly.",
        offset: "md:mt-16",
    },
    {
        icon: Globe,
        title: "Dedicated Support",
        description: "Our team is always here to guide you with continuous client onboarding, product training, and dedicated desk assistance.",
        offset: "md:mt-0",
    },
    {
        icon: Users,
        title: "Be Part of Network",
        description: "Join a strong community of verified partners, chartered accountants, and consultants across India and scale together.",
        offset: "md:mt-8",
    },
];

const features = [
    "Access to sales & marketing resources and co-branded kits",
    "Structured product training and recognized professional certifications",
    "Dedicated partner manager and prioritized client onboarding",
    "Transparent, attractive commission structure with automated payouts",
    "Ongoing technical, compliance, and corporate filing support",
];

const steps = [
    { icon: FileText, title: "Apply", description: "Fill out the simple partner application form with your professional credentials." },
    { icon: ClipboardCheck, title: "Get Approved", description: "Our partner team reviews your application and validates your profile within 24 hours." },
    { icon: BookOpen, title: "Get Trained", description: "Access product knowledge portals, live onboarding webinars, and sales materials." },
    { icon: TrendingUp, title: "Start Growing", description: "Begin offering Bizpole solutions to your clients and earn handsome recurring rewards." },
];

const trustedBrands = ["VASTRA", "NextGen", "ACCURA", "FINMATE", "TAXPRO", "LedgerHub"];

const faqs = [
    {
        q: "Who can become a Bizpole One partner?",
        a: "Our partner program is open to individuals, business consultants, chartered accountants, company secretaries, tax professionals, agencies, and organizations who want to offer Bizpole One corporate and compliance solutions to their clients.",
    },
    {
        q: "Is there any registration fee?",
        a: "No. Joining the Bizpole One partner program is completely free. You only need to complete the application and verification process.",
    },
    {
        q: "How do I earn as a partner?",
        a: "You earn a commission on every service your referred clients purchase, along with recurring rewards on renewals and subscriptions. Payouts are automated and fully transparent.",
    },
    {
        q: "What kind of support will I receive?",
        a: "Every partner gets a dedicated partner manager, prioritized client onboarding, marketing collateral, and ongoing technical and compliance support.",
    },
    {
        q: "Do I get training on the products?",
        a: "Yes. You get access to product knowledge portals, live onboarding webinars, and certification programs so you can confidently serve your clients.",
    },
];

const SectionHeading = ({ title, subtitle }) => (
    <div className="text-center mb-14" data-aos="fade-up">
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">{title}</h2>
        {subtitle && <p className="text-gray-500 text-base md:text-lg">{subtitle}</p>}
    </div>
);

const Partners = () => {
    const navigate = useNavigate();
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);

    useEffect(() => {
        AOS.init({ duration: 900, once: true });
    }, []);

    const openSignup = () => setIsSignupModalOpen(true);

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative bg-white overflow-hidden border-b border-gray-100">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="lg:w-1/2 pt-12 md:pt-20 pb-10 lg:pb-20 lg:min-h-[560px] flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7 }}
                        >
                            <h1 className="text-4xl md:text-6xl font-extrabold text-black leading-[1.1] tracking-tight mb-6">
                                Grow Your Business <br />
                                <span className="text-yellow-400">Partner With Us</span>
                            </h1>
                            <p className="text-gray-500 text-base md:text-lg max-w-lg mb-8 leading-relaxed">
                                Join India's fastest-growing business network. We empower partners with the technology, leads, and operational support needed to scale and succeed in the digital economy.
                            </p>
                            <div className="flex flex-wrap gap-4 mb-8">
                                <button
                                    onClick={openSignup}
                                    className="bg-yellow-400 text-black px-8 py-3.5 rounded-full font-semibold shadow-[0_6px_24px_rgba(250,204,21,0.55)] hover:bg-yellow-500 transition-all flex items-center gap-2"
                                >
                                    Join Partner Program <ArrowRight size={18} />
                                </button>
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="bg-white border border-gray-200 text-black px-8 py-3.5 rounded-full font-semibold shadow-sm hover:border-black transition-all"
                                >
                                    Existing Partner
                                </button>
                            </div>
                            <div className="border-t border-gray-200 pt-6 max-w-xl flex flex-wrap gap-x-10 gap-y-3">
                                {trustBadges.map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                        <span className="w-7 h-7 rounded-full bg-yellow-50 flex items-center justify-center">
                                            <Icon size={14} className="text-yellow-500" />
                                        </span>
                                        {label}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Image bleeds off the top-right edge on desktop */}
                <motion.img
                    src={heroImage}
                    alt="Bizpole partners shaking hands"
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="w-full max-w-xl ml-auto block lg:max-w-none lg:w-auto lg:absolute lg:top-0 lg:right-0 lg:h-full object-contain object-right-top"
                />
            </section>

            {/* Why Partner Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-14" data-aos="fade-up">
                        <h2 className="text-3xl md:text-5xl font-bold text-black mb-3">
                            Why Partner With <span className="text-yellow-500">Bizpole?</span>
                        </h2>
                        <p className="text-gray-500 text-base md:text-lg">
                            More opportunities. More growth. A stronger future together.
                        </p>
                    </div>

                    <div className="relative">
                        {/* Dashed connecting wave (desktop) */}
                        <svg
                            className="hidden lg:block absolute top-6 left-0 w-full h-32 pointer-events-none"
                            viewBox="0 0 1000 120"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M125 45 C 220 45, 290 85, 375 65 S 560 0, 625 25 S 800 50, 875 40"
                                fill="none"
                                stroke="#facc15"
                                strokeWidth="2"
                                strokeDasharray="6 6"
                            />
                        </svg>

                        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-0 lg:divide-x divide-gray-100">
                            {benefits.map(({ icon: Icon, title, description, offset }, index) => (
                                <div
                                    key={title}
                                    className={`flex flex-col items-center text-center px-6 ${offset}`}
                                    data-aos="fade-up"
                                    data-aos-delay={index * 100}
                                >
                                    <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center mb-8 shadow-[0_0_0_10px_rgba(250,204,21,0.08)]">
                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <Icon size={22} className="text-yellow-500" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-black mb-3">{title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed max-w-[240px]">{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Everything You Need Section */}
            <section className="py-20 bg-yellow-50/40">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="relative" data-aos="fade-right">
                            <div className="absolute -top-6 -left-6 w-40 h-40 bg-yellow-200/50 rounded-full blur-3xl" />
                            <img
                                src={SUCCESS_IMAGE}
                                alt="Partner celebrating success"
                                className="relative w-full max-w-lg mx-auto rounded-3xl object-cover aspect-[5/4] shadow-xl"
                            />
                        </div>
                        <div data-aos="fade-left">
                            <h2 className="text-3xl md:text-4xl font-bold text-black leading-tight mb-5">
                                Everything You Need <br />
                                <span className="text-yellow-500">to Succeed</span>
                            </h2>
                            <p className="text-gray-500 mb-6 max-w-lg leading-relaxed">
                                Get the tools, training, and resources to grow your business with Bizpole One. Our purpose-built partner program is designed to help you win more clients and build recurring, long-term success.
                            </p>
                            <ul className="space-y-3 mb-8">
                                {features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                                        <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-yellow-100 flex items-center justify-center">
                                            <Check size={12} className="text-yellow-600" strokeWidth={3} />
                                        </span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={openSignup}
                                className="bg-yellow-400 text-black px-6 py-2.5 rounded-full font-semibold text-sm shadow-md hover:bg-yellow-500 transition-all inline-flex items-center gap-2"
                            >
                                Join Partner Program <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <SectionHeading title="How It Works" subtitle="A simple and smooth process to get started." />

                    <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
                        {steps.map(({ icon: Icon, title, description }, index) => {
                            const isRight = index % 2 === 1;
                            return (
                                <div
                                    key={title}
                                    className={`relative flex ${isRight ? "md:justify-end" : "md:justify-start"}`}
                                    data-aos={isRight ? "fade-left" : "fade-right"}
                                    data-aos-delay={index * 100}
                                >
                                    {/* Dashed connector to the next step (desktop) */}
                                    {index < steps.length - 1 && (
                                        <div className="hidden md:block absolute top-full mt-5 left-[30%] w-[40%] border-t-2 border-dashed border-yellow-400">
                                            <span
                                                className={`absolute -top-[5px] w-2 h-2 rounded-full bg-yellow-400 ${
                                                    isRight ? "left-0" : "right-0"
                                                }`}
                                            />
                                        </div>
                                    )}
                                    <div className="flex w-full md:w-[52%] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
                                        <div className="w-10 shrink-0 bg-yellow-400 flex items-center justify-center">
                                            <span className="-rotate-90 whitespace-nowrap text-[10px] font-bold tracking-widest text-black">
                                                STEP {String(index + 1).padStart(2, "0")}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-4 p-6">
                                            <span className="w-10 h-10 shrink-0 rounded-lg bg-yellow-50 flex items-center justify-center">
                                                <Icon size={18} className="text-yellow-600" />
                                            </span>
                                            <div>
                                                <h3 className="text-lg font-bold text-black mb-1">{title}</h3>
                                                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Trusted By Section */}
            <section className="py-14 bg-yellow-50/40 border-y border-yellow-100/60">
                <div className="container mx-auto px-6 text-center" data-aos="fade-up">
                    <h3 className="text-xl md:text-2xl font-bold text-black mb-2">Trusted by Growing Businesses</h3>
                    <p className="text-sm text-gray-500 mb-10">Our partners are building successful businesses with Bizpole One.</p>
                    <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-6">
                        {trustedBrands.map((brand) => (
                            <span key={brand} className="flex items-center gap-2 text-gray-600 font-bold tracking-wide text-sm md:text-base">
                                <Triangle size={14} className="text-gray-400" />
                                {brand}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 max-w-6xl mx-auto">
                        <div data-aos="fade-right">
                            <h2 className="text-3xl md:text-4xl font-bold text-black leading-tight mb-6">
                                Let's Build <br /> Something <br /> Together
                            </h2>
                            <div className="w-12 h-1 bg-yellow-400 rounded-full mb-6" />
                            <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs">
                                Have questions about the partner program? Our team is happy to help you understand how Bizpole One can grow your practice.
                            </p>
                            <button
                                onClick={() => navigate("/contact")}
                                className="border-2 border-yellow-400 text-yellow-600 px-8 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-yellow-400 hover:text-black transition-all"
                            >
                                Get In Touch
                            </button>
                        </div>

                        <div className="divide-y divide-gray-100" data-aos="fade-left">
                            {faqs.map((faq, index) => {
                                const isOpen = openFaq === index;
                                return (
                                    <div key={faq.q} className="py-5">
                                        <button
                                            onClick={() => setOpenFaq(isOpen ? -1 : index)}
                                            className="w-full flex items-center justify-between gap-4 text-left"
                                        >
                                            <span className="font-semibold text-black text-sm md:text-base">{faq.q}</span>
                                            <span className="w-5 h-5 shrink-0 rounded-full bg-yellow-400 flex items-center justify-center">
                                                {isOpen ? <Minus size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                                            </span>
                                        </button>
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.p
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden text-sm text-gray-500 leading-relaxed pr-8"
                                                >
                                                    <span className="block pt-4">{faq.a}</span>
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="pb-20 bg-white">
                <div className="container mx-auto px-6">
                    <div
                        className="relative max-w-6xl mx-auto bg-yellow-400 rounded-3xl overflow-hidden px-8 md:px-14 py-14 shadow-xl"
                        data-aos="zoom-in"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">Ready to Grow Together?</h2>
                                <p className="text-black/80 mb-8 max-w-md">
                                    Join the Bizpole One partner program today and unlock brand new recurring opportunities for your practice.
                                </p>
                                <button
                                    onClick={openSignup}
                                    className="bg-black text-white px-7 py-3 rounded-full font-semibold text-sm hover:bg-gray-800 transition-all inline-flex items-center gap-2"
                                >
                                    Join Partner Program <ArrowRight size={16} />
                                </button>
                            </div>

                            {/* Growth chart illustration */}
                            <div className="relative h-56 hidden md:block" aria-hidden="true">
                                <div className="absolute bottom-0 left-4 right-16 flex items-end gap-3">
                                    {[30, 45, 60, 78, 95].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-t-lg bg-gradient-to-b from-yellow-200 to-yellow-500 shadow-[inset_0_2px_0_rgba(255,255,255,0.6)] border border-yellow-300"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="none">
                                    <path d="M20 190 Q 160 170 250 110 T 360 25" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" />
                                    <path d="M335 20 L 372 18 L 360 52" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <Star size={18} className="absolute top-6 left-1/3 text-white fill-white" />
                                <Plus size={22} className="absolute bottom-10 left-0 text-white" strokeWidth={3} />
                                <Plus size={18} className="absolute top-1/3 right-4 text-white" strokeWidth={3} />
                                <div className="absolute top-8 right-0 bg-white rounded-lg shadow-md px-3 py-2 text-[11px] leading-tight">
                                    <p className="font-bold text-black">More Opportunities</p>
                                    <p className="text-gray-500">Higher Revenue</p>
                                    <p className="text-gray-500">Long-term Growth</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Signup Modal */}
            <PartnerSignupModal
                isOpen={isSignupModalOpen}
                onClose={() => setIsSignupModalOpen(false)}
                onSwitchToLogin={() => {
                    setIsSignupModalOpen(false);
                    setIsLoginModalOpen(true);
                }}
            />

            <PartnerLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onSwitchToSignup={() => {
                    setIsLoginModalOpen(false);
                    setIsSignupModalOpen(true);
                }}
            />
        </div>
    );
};

export default Partners;
