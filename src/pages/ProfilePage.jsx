import { useEffect, useState } from "react";
import { createCustomer } from "../api/CustomerApi";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
} from "lucide-react";
import { setSecureItem, getSecureItem } from "../utils/secureStorage";

// Field config — name must match your user/form object keys
const editableFields = [
  { name: "FirstName",    label: "Full Name",     icon: <User  size={16} /> },
  { name: "Email",        label: "Email Address", icon: <Mail  size={16} /> },
  { name: "Mobile",       label: "Phone Number",  icon: <Phone size={16} /> },
  {
    name: "AddressLine1",
    label: "Address",
    icon: <MapPin size={16} />,
    fullWidth: true,
    type: "textarea",
  },
];

const ProfilePage = () => {
  const [user, setUser] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const storedUser = getSecureItem("user");
    console.log(storedUser, "amlstored");

    if (storedUser) {
      setUser(storedUser);
      setForm(storedUser);
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setEditMode(true);
    setMessage({ type: "", text: "" });
  };

  const handleCancel = () => {
    setForm(user);
    setEditMode(false);
    setMessage({ type: "", text: "" });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const payload = { ...form };

      if (user.CustomerID) {
        payload.CustomerID = user.CustomerID;
      }

      const res = await createCustomer(payload);
      console.log(res, "Customer update response");

      setUser(payload);
      setEditMode(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Store as JSON string to avoid parsing error
      setSecureItem("user", payload);

      console.log("User updated in secure storage:", payload);
    } catch (err) {
      console.error(err, "aml error");
      setMessage({ type: "error", text: "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" mx-auto mt-8">
      <div className="mx-auto px-6 py-10">
        {/* Heading */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Profile</h1>
      </div>
      <motion.div
        className="bg-white rounded-2xl shadow-sm mx-auto p-8 border border-yellow-200 max-w-5xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <User className="text-yellow-500" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">
            Contact Information
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Manage your personal contact details and address information.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {editableFields.map((field) => (
            <div
              key={field.name}
              className={`flex flex-col ${field.fullWidth ? "md:col-span-2" : ""}`}
            >
              <label className="flex items-center gap-1.5 text-sm text-gray-700 mb-1.5">
                <span className="text-yellow-500">{field.icon}</span>
                {field.label}
              </label>

              {editMode ? (
                field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    value={form[field.name] || ""}
                    onChange={handleChange}
                    rows={3}
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                    className="w-full border border-yellow-300 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    name={field.name}
                    value={form[field.name] || ""}
                    onChange={handleChange}
                    placeholder={field.label}
                    className="w-full border border-yellow-300 bg-gray-50 rounded-lg px-3.5 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                  />
                )
              ) : (
                <div className="text-gray-800 text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg min-h-[42px]">
                  {user[field.name] || (
                    <span className="text-gray-400">Not set</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-8 justify-end">
          {editMode ? (
            <>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-5 py-2.5 rounded-lg transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-5 py-2.5 rounded-lg transition text-sm shadow-sm"
              >
                <Save size={16} />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 rounded-lg transition shadow-md"
            >
              Edit Profile
            </button>
          )}
        </div>

        {message.text && (
          <motion.div
            className={`mt-6 flex items-center gap-2 justify-center text-sm font-medium ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <XCircle size={18} />
            )}
            {message.text}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfilePage;
