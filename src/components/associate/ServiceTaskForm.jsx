import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Loader2, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { serviceFormSave, updateRejectedFields } from '../../api/Services/ServiceDetails';
import { uploadFile } from '../../api/StorageApi';


const ServiceTaskForm = ({ task, serviceDetails, onClose, onSuccess, responseFields }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | saving | success | error

    const item = task.originalData;
    const sections = item.Sections || [];

    // A field/task can come back flagged as 1, "1" or true depending on the source — treat them all as set
    const isRejectedFlag = (v) => v === 1 || v === '1' || v === true;
    const isVerifiedFlag = (v) => v === 1 || v === '1' || v === true;
    // The task row itself may already carry the "Not Approved" verdict even when no per-field flag is present
    const taskRejected = String(task?.status || '').toLowerCase() === 'not approved';

    // ── Helper to get previous field data ──
    const getFieldPrevData = (fieldID, fieldName) => {
        const dataArray = Array.isArray(responseFields) ? responseFields : (responseFields?.results || []);
        if (!dataArray || dataArray.length === 0) return null;

        // Loop backwards through response sets to find the most recent submission
        for (let i = dataArray.length - 1; i >= 0; i--) {
            const set = dataArray[i];
            const foundField = set.fields?.find(f =>
                (f.field_id && Number(f.field_id) === Number(fieldID)) ||
                (f.field_key === fieldName)
            );
            if (foundField) return foundField;
        }
        return null;
    };

    // ── Pre-fill data ──
    useEffect(() => {
        const initialData = {};
        sections.forEach(section => {
            section.Fields?.forEach(field => {
                const prevData = getFieldPrevData(field.FieldID, field.FieldName);
                if (prevData) {
                    // Use field_text for files/text, or value_json fallback
                    const val = prevData.field_text || (typeof prevData.value_json === 'string' ? prevData.value_json : "");
                    initialData[`${section.SectionID}_${field.FieldID}`] = val;
                } else if (field.Value) {
                    initialData[`${section.SectionID}_${field.FieldID}`] = field.Value;
                }
            });
        });
        setFormData(initialData);
    }, [sections, responseFields]);

    const isFieldEditable = (fieldID, fieldName) => {
        const prevData = getFieldPrevData(fieldID, fieldName);
        // If never submitted, it's editable. If submitted, only editable if it (or the whole task) was rejected.
        if (!prevData) return true;
        return isRejectedFlag(prevData.reject) || taskRejected;
    };

    const hasRejectedFields = sections.some(section =>
        section.Fields?.some(field => {
            const prevData = getFieldPrevData(field.FieldID, field.FieldName);
            return prevData && isRejectedFlag(prevData.reject);
        })
    );

    // Drive the rejection banner off both the per-field flag and the task-level verdict
    const showRejectionNotice = hasRejectedFields || taskRejected;

    const hasPreviousSubmission = sections.some(section =>
        section.Fields?.some(field => getFieldPrevData(field.FieldID, field.FieldName))
    );

    const hasEditableFields = sections.some(section =>
        section.Fields?.some(field => isFieldEditable(field.FieldID, field.FieldName))
    );

    const showSubmit = !hasPreviousSubmission || showRejectionNotice || hasEditableFields;

    const handleFieldChange = (sectionID, fieldID, fieldName, val) => {
        if (!isFieldEditable(fieldID, fieldName)) return;
        setFormData(prev => ({
            ...prev,
            [`${sectionID}_${fieldID}`]: val
        }));
        if (errors[`${sectionID}_${fieldID}`]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[`${sectionID}_${fieldID}`];
                return newErrs;
            });
        }
    };

    const validate = () => {
        let newErrors = {};
        sections.forEach(section => {
            section.Fields.forEach(field => {
                // Only validate editable fields? Usually yes, if it's already there it's fine.
                if (isFieldEditable(field.FieldID) && field.IsMandatory === 1 && !formData[`${section.SectionID}_${field.FieldID}`]) {
                    newErrors[`${section.SectionID}_${field.FieldID}`] = 'Required';
                }
            });
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setStatus('saving');
        console.log("Submitting form with data:", serviceDetails);
        try {
            const finalFormData = { ...formData };

            // Handle file uploads
            for (const key in finalFormData) {
                if (finalFormData[key] instanceof File) {
                    try {
                        const uploadRes = await uploadFile(finalFormData[key]);
                        if (uploadRes.success) {
                            finalFormData[key] = uploadRes.data.url;
                        } else {
                            throw new Error(uploadRes.message || "Upload failed");
                        }
                    } catch (uploadErr) {
                        console.error(`Error uploading file for ${key}:`, uploadErr);
                        throw new Error(`Failed to upload file for ${key}`);
                    }
                }
            }

            const payload = {
                CompanyID: serviceDetails?.CompanyID,
                ServiceID: serviceDetails?.ServiceID,
                QuoteID: serviceDetails?.QuoteID,
                OrderID: serviceDetails?.OrderID,
                submittedBy: serviceDetails?.submittedBy,
                ResponseData: {
                    forms: sections.map(section => ({
                        FormID: item.FormId,
                        SubFormID: item.SubFormId,
                        FormBuilderId: item.Id?.toString() || "",
                        Sections: [{
                            SectionID: section.SectionID,
                            Fields: section.Fields.map(field => {
                                const val = finalFormData[`${section.SectionID}_${field.FieldID}`] || "";
                                const isFile = (field.FieldType || '').toLowerCase() === 'file';
                                const fieldObj = {
                                    FieldID: field.FieldID,
                                    FieldKey: field.FieldName,
                                    FieldType: field.FieldType,
                                    Value: val
                                };
                                if (isFile) {
                                    fieldObj.field_text = val;
                                }
                                return fieldObj;
                            })
                        }]
                    }))
                }
            };


            if (hasPreviousSubmission) {
                // If it's an update to an existing submission (specifically for rejected fields)
                const updates = [];
                sections.forEach(section => {
                    section.Fields.forEach(field => {
                        const editable = isFieldEditable(field.FieldID, field.FieldName);
                        const prevData = getFieldPrevData(field.FieldID, field.FieldName);

                        // Only include fields that are editable (rejected) and actually have previous data to update
                        if (editable && prevData && prevData.fieldRows_id) {
                            const val = finalFormData[`${section.SectionID}_${field.FieldID}`];
                            const isFile = (field.FieldType || '').toLowerCase() === 'file';

                            updates.push({
                                fieldRowsId: prevData.fieldRows_id,
                                value: val,
                                fieldText: isFile ? val : null
                            });
                        }
                    });
                });

                if (updates.length > 0) {
                    await updateRejectedFields({ updates });
                } else {
                    // Fallback to normal save if no specific updates found but we somehow got here
                    await serviceFormSave(payload);
                }
            } else {
                // First-time submission
                await serviceFormSave(payload);
            }

            setStatus('success');
            if (onSuccess) onSuccess();
            // If onSuccess is used to trigger a parent update, it will be called
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            console.error("Error saving form:", error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden"
            >
                {/* Header */}
                <div className="px-8 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
                        {showRejectionNotice && (
                            <span className="text-xs font-medium text-red-500 bg-red-100 px-3 py-1 rounded-full">
                                Not Approved
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="px-8 py-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {status === 'success' ? (
                        <div className="py-16 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Form Submitted Successfully!</h3>
                            <p className="text-gray-500 text-sm">Your information has been saved and is being reviewed.</p>
                        </div>
                    ) : (
                        <>
                            {showRejectionNotice && (
                                <div className="mb-6 text-sm text-gray-700 leading-relaxed">
                                    Important: The information you submitted could not be verified. Kindly provide the information as outlined below.
                                </div>
                            )}

                            <div className="space-y-8">
                                {sections.map((section) => (
                                    <div key={section.SectionID}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                            {section.Fields.map((field) => {
                                                const fieldKey = `${section.SectionID}_${field.FieldID}`;
                                                const hasError = !!errors[fieldKey];
                                                const type = (field.FieldType || 'Text').toLowerCase();
                                                const editable = isFieldEditable(field.FieldID, field.FieldName);
                                                const prevData = getFieldPrevData(field.FieldID, field.FieldName);
                                                return (
                                                    <div key={field.FieldID}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-sm text-gray-700 flex items-center gap-1.5">
                                                                {field.FieldName}
                                                                {prevData && isRejectedFlag(prevData.reject) && (
                                                                    <span className="text-[10px] font-medium text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                                                                        Rejected
                                                                    </span>
                                                                )}
                                                                {prevData && isVerifiedFlag(prevData.verify) && (
                                                                    <span className="text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                                                        Verified
                                                                    </span>
                                                                )}
                                                            </label>
                                                            <span className="w-4 h-4 rounded-full border border-red-300 text-red-400 text-[10px] flex items-center justify-center">
                                                                i
                                                            </span>
                                                        </div>
                                                        {type === 'file' ? (
                                                            <div>
                                                                {formData[fieldKey] ? (
                                                                    <div className={`flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm ${!editable ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                                        <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                                                                        <span className="truncate max-w-[220px]">
                                                                            {typeof formData[fieldKey] === 'string' ?
                                                                                (formData[fieldKey].split('/').pop() || 'View File') :
                                                                                (formData[fieldKey].name || 'File Selected')}
                                                                        </span>
                                                                        {editable && (
                                                                            <label className="ml-auto text-xs font-medium text-yellow-600 hover:text-yellow-700 cursor-pointer flex-shrink-0">
                                                                                Change
                                                                                <input
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    onChange={(e) => handleFieldChange(section.SectionID, field.FieldID, field.FieldName, e.target.files[0])}
                                                                                />
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <label
                                                                        className={`inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium px-4 py-2.5 rounded-lg cursor-pointer w-fit ${hasError ? 'ring-2 ring-red-300' : ''} ${!editable ? 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-400' : ''}`}
                                                                    >
                                                                        <Upload className="w-3.5 h-3.5" />
                                                                        Upload Files
                                                                        <input
                                                                            type="file"
                                                                            className="hidden"
                                                                            disabled={!editable}
                                                                            onChange={(e) => handleFieldChange(section.SectionID, field.FieldID, field.FieldName, e.target.files[0])}
                                                                        />
                                                                    </label>
                                                                )}
                                                                {formData[fieldKey] && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => window.open(formData[fieldKey], '_blank')}
                                                                        className="mt-2 text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1.5"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" /> View Previous File
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                                                                value={formData[fieldKey] || ''}
                                                                disabled={!editable}
                                                                onChange={(e) => handleFieldChange(section.SectionID, field.FieldID, field.FieldName, e.target.value)}
                                                                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${hasError ? 'border-red-300 bg-red-50/20' : 'border-yellow-400 focus:ring-yellow-400'} ${!editable ? 'bg-gray-50 cursor-not-allowed text-gray-400' : ''}`}
                                                            />
                                                        )}

                                                        <p className={`text-xs mt-1.5 ${hasError ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                                            {hasError ? errors[fieldKey] : (field.IsMandatory === 1 ? 'Required' : '')}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {status !== 'success' && showSubmit && (
                        <div className="flex items-center justify-end gap-3 mt-8">
                            {status === 'error' && (
                                <p className="flex items-center gap-1.5 text-xs font-medium text-red-500 mr-auto">
                                    <AlertCircle className="w-4 h-4" /> Failed to save
                                </p>
                            )}
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 text-white text-sm font-semibold px-6 py-2 rounded-lg shadow-sm flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT'}
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>
        </div>
    );
};

export default ServiceTaskForm;