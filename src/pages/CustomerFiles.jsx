import { useRef, useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomerDocApi from '../api/CustomerDocApi';
import { getSecureItem } from "../utils/secureStorage";
import { ProfileCompanyContext } from './ProfileLayout';

const fileTypes = [
  {
    key: 'PAN',
    label: 'PAN Card',
    icon: '📄',
    description: 'Upload a clear image of your PAN card',
    acceptedFormats: 'PNG, JPG up to 10MB'
  },
  {
    key: 'ADHAAR',
    label: 'Aadhaar Card',
    icon: '🆔',
    description: 'Upload a clear image of your Aadhaar card',
    acceptedFormats: 'PNG, JPG up to 10MB'
  },
  {
    key: 'PassportPhoto',
    label: 'Passport Photo',
    icon: '📷',
    description: 'Upload passport size Photo',
    acceptedFormats: 'JPG, PNG (Max 2MB)'
  },
];

const CustomerFiles = () => {
  const { selectedCompanyId } = useContext(ProfileCompanyContext);
  const [files, setFiles] = useState({ PAN: null, ADHAAR: null, PassportPhoto: null });
  const [previews, setPreviews] = useState({ PAN: '', ADHAAR: '', PassportPhoto: '' });
  const [uploadedDocs, setUploadedDocs] = useState({ PAN: false, ADHAAR: false, PassportPhoto: false });
  const [uploadedDocData, setUploadedDocData] = useState({ PAN: '', ADHAAR: '', PassportPhoto: '' });
  const [modal, setModal] = useState({ open: false, type: null });
  const [modalUrl, setModalUrl] = useState('');
  const [modalType, setModalType] = useState('');
  const [modalMime, setModalMime] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ PAN: 0, ADHAAR: 0, PassportPhoto: 0 });
  const [dragOver, setDragOver] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ PAN: '', ADHAAR: '', PassportPhoto: '' });
  const [isUploading, setIsUploading] = useState({ PAN: false, ADHAAR: false, PassportPhoto: false });
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const inputRefs = {
    PAN: useRef(),
    ADHAAR: useRef(),
    PassportPhoto: useRef(),
  };

  // Fixed: Safe parsing of user data from secureStorage
  const getUserData = () => {
    try {
      const userStr = getSecureItem("user");

      // If userStr is already an object, return it directly
      if (typeof userStr === 'object' && userStr !== null) {
        return userStr;
      }

      // If it's a string, try to parse it
      if (typeof userStr === 'string') {
        // Clean the string if it contains :NULL
        const cleanStr = userStr.replace(/:NULL/g, ':null');
        return JSON.parse(cleanStr);
      }

      // Return empty object if nothing works
      return {};
    } catch (error) {
      console.error('Error parsing user data:', error);
      return {};
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0, opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  // Convert Base64 to proper data URL
  // const base64ToDataUrl = (base64String, mimeType = 'image/jpeg') => {
  //   if (!base64String) return '';
  //   // Remove any existing data URL prefix if present
  //   const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');
  //   return `data:${mimeType};base64,${cleanBase64}`;
  // };

  // Check which documents are already uploaded
  // useEffect(() => {
  //   const checkUploadedDocuments = async () => {
  //     try {
  //       setLoadingDocs(true);
  //       const documents = await CustomerDocApi.getUploadedDocuments(customerId);
  //       console.log('Fetched documents:', documents); // Debug log

  //       // Check which documents exist in the response and store Base64 data
  //       const uploadedState = {
  //         PAN: !!documents.PAN,
  //         ADHAAR: !!documents.ADHAAR,
  //         PassportPhoto: !!documents.PassportPhoto
  //       };

  //       const uploadedData = {
  //         PAN: documents.pan ? base64ToDataUrl(documents.pan) : '',
  //         ADHAAR: documents.aadhaar ? base64ToDataUrl(documents.aadhaar) : '',
  //         PassportPhoto: documents.passportphoto ? base64ToDataUrl(documents.passportphoto) : ''
  //       };

  //       setUploadedDocs(uploadedState);
  //       setUploadedDocData(uploadedData);
  //     } catch (error) {
  //       console.error('Error checking uploaded documents:', error);
  //       // If error, assume no documents are uploaded
  //       setUploadedDocs({ PAN: false, ADHAAR: false, PassportPhoto: false });
  //       setUploadedDocData({ PAN: '', ADHAAR: '', PassportPhoto: '' });
  //     } finally {
  //       setLoadingDocs(false);
  //     }
  //   };

  //   checkUploadedDocuments();
  // }, []);

  useEffect(() => {
    const checkUploadedDocuments = async () => {
      try {
        setLoadingDocs(true);
        setUploadedDocs({ PAN: false, ADHAAR: false, PassportPhoto: false });
        setUploadedDocData({ PAN: '', ADHAAR: '', PassportPhoto: '' });

        const customerId = getUserData().FirstName;
        const documents = await CustomerDocApi.getUploadedDocuments(customerId);
        console.log('Fetched documents:', documents);

        const uploadedState = {
          PAN: !!documents.PAN,
          ADHAAR: !!documents.ADHAAR,
          PassportPhoto: !!documents.PassportPhoto
        };

        const uploadedData = {
          PAN: documents.PAN || '',
          ADHAAR: documents.ADHAAR || '',
          PassportPhoto: documents.PassportPhoto || ''
        };

        setUploadedDocs(uploadedState);
        setUploadedDocData(uploadedData);
      } catch (error) {
        console.error('Error checking uploaded documents:', error);
        setUploadedDocs({ PAN: false, ADHAAR: false, PassportPhoto: false });
        setUploadedDocData({ PAN: '', ADHAAR: '', PassportPhoto: '' });
      } finally {
        setLoadingDocs(false);
      }
    };

    checkUploadedDocuments();
  }, [selectedCompanyId]);

  // Upload flow functions
  const handleFileChange = (type, e) => {
    console.log("FILES STATE:", files);
    console.log("type", type);

    const file = e.target.files[0];
    if (file) {
      const maxSize = type === 'PassportPhoto' ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File size too large. Maximum allowed: ${type === 'PassportPhoto' ? '2MB' : '10MB'}`);
        return;
      }
      setFiles((prev) => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => ({ ...prev, [type]: ev.target.result }));
      };
      reader.readAsDataURL(file);
      setUploadStatus((prev) => ({ ...prev, [type]: '' }));
      setUploadProgress((prev) => ({ ...prev, [type]: 0 }));
    }
  };

  const handleUploadClick = (type) => {
    inputRefs[type].current.click();
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    setDragOver(type);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (type, e) => {
    e.preventDefault();
    setDragOver(null);
    handleFileChange(type, { target: { files: e.dataTransfer.files } });
  };

  const removeFile = (type, e) => {
    e.stopPropagation();
    setFiles(prev => ({ ...prev, [type]: null }));
    setPreviews(prev => ({ ...prev, [type]: '' }));
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    setUploadStatus(prev => ({ ...prev, [type]: '' }));
  };

  // const handleUploadToServer = async (type) => {
  //   if (!files[type]) {
  //     setUploadStatus((prev) => ({ ...prev, [type]: 'No file selected.' }));
  //     return;
  //   }
  //   setIsUploading((prev) => ({ ...prev, [type]: true }));
  //   setUploadStatus((prev) => ({ ...prev, [type]: '' }));
  //   setUploadProgress((prev) => ({ ...prev, [type]: 0 }));

  //   let progress = 0;
  //   const interval = setInterval(() => {
  //     progress += 10;
  //     setUploadProgress((prev) => ({ ...prev, [type]: progress }));
  //     if (progress >= 90) clearInterval(interval);
  //   }, 80);

  //   try {
  //     await CustomerDocApi.uploadDocument(type, files[type]);
  //     setUploadStatus((prev) => ({ ...prev, [type]: 'Uploaded successfully!' }));
  //     setUploadProgress((prev) => ({ ...prev, [type]: 100 }));
  //     setUploadedDocs((prev) => ({ ...prev, [type]: true }));

  //     // Store the preview as uploaded data
  //     setUploadedDocData((prev) => ({ 
  //       ...prev, 
  //       [type]: previews[type] 
  //     }));

  //     setFiles((prev) => ({ ...prev, [type]: null }));
  //     setPreviews((prev) => ({ ...prev, [type]: '' }));
  //   } catch (err) {
  //     setUploadStatus((prev) => ({ ...prev, [type]: 'Upload failed!' }));
  //     setUploadProgress((prev) => ({ ...prev, [type]: 0 }));
  //   } finally {
  //     setIsUploading((prev) => ({ ...prev, [type]: false }));
  //   }
  // };


  const handleUploadToServer = async (type) => {
    if (!files[type]) {
      setUploadStatus(prev => ({ ...prev, [type]: 'No file selected.' }));
      return;
    }

    setIsUploading(prev => ({ ...prev, [type]: true }));
    setUploadStatus(prev => ({ ...prev, [type]: '' }));
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(prev => ({ ...prev, [type]: progress }));
      if (progress >= 90) clearInterval(interval);
    }, 80);

    try {
      // Call postAllDocuments with the single file
      const response = await CustomerDocApi.postAllDocuments({ [type]: files[type] });

      console.log('Upload Response:', response);

      setUploadStatus(prev => ({ ...prev, [type]: 'Uploaded successfully!' }));
      setUploadProgress(prev => ({ ...prev, [type]: 100 }));
      setUploadedDocs(prev => ({ ...prev, [type]: true }));

      // Store the preview as uploaded data
      setUploadedDocData(prev => ({ ...prev, [type]: previews[type] }));

      // Clear selected file & preview
      setFiles(prev => ({ ...prev, [type]: null }));
      setPreviews(prev => ({ ...prev, [type]: '' }));
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus(prev => ({ ...prev, [type]: 'Upload failed!' }));
      setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    } finally {
      setIsUploading(prev => ({ ...prev, [type]: false }));
    }
  };


  // Preview uploaded file from local state (for newly selected files)
  const handlePreviewLocal = (type) => {
    if (previews[type]) {
      setModalUrl(previews[type]);
      setModalType(type);
      setModalMime('image/*');
      setModal({ open: true, type });
    }
  };

  // Preview uploaded doc from stored Base64 data
  const handlePreviewUploaded = (type) => {
    if (uploadedDocData[type]) {
      setModalUrl(uploadedDocData[type]);
      setModalType(type);
      setModalMime('image/*');
      setModal({ open: true, type });
    }
  };

  // Render file status based on different states
  const renderFileStatus = (type, label) => {
    // If file is selected but not uploaded yet
    if (files[type]) {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <p className="font-medium text-gray-900"> {type}</p>
              <p className="text-sm text-gray-500">{(files[type].size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => handlePreviewLocal(type)}
              className="w-24 px-3 py-2 text-sm font-medium text-center text-yellow-600 bg-white border border-yellow-600 rounded-md hover:bg-yellow-50"
            >
              View
            </button>
            <button
              onClick={() => handleUploadClick(type)}
              className="w-24 px-3 py-2 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Change
            </button>

            <button
              onClick={() => handleUploadToServer(type)}
              className="w-24 px-3 py-2 text-sm font-medium text-center text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-60"
              disabled={isUploading[type]}
            >
              {isUploading[type] ? 'Uploading...' : 'Upload'}
            </button>

            <button
              onClick={(e) => removeFile(type, e)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      );
    }

    // If document is already uploaded to server
    if (uploadedDocs[type]) {
  return (
    <div className="flex flex-col items-center text-center">
      
      <p className="text-sm font-medium text-gray-900 mb-2">{label} Uploaded</p>
      <div className="flex items-center justify-center flex-wrap gap-2">
        <button
          onClick={() => handlePreviewUploaded(type)}
          className="w-28 px-2 py-1.5 text-sm font-medium text-center text-yellow-600 bg-white border border-yellow-600 rounded-md hover:bg-yellow-50"
        >
          View
        </button>
        <button
          onClick={() => handleUploadClick(type)}
          className="w-28 px-2 py-1.5 text-sm font-medium text-center text-white bg-yellow-400 cursor-pointer rounded-md hover:bg-yellow-700"
        >
          Upload New
        </button>
      </div>
    </div>
  );
}


    // Empty state - no file selected and not uploaded
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver === type ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        onClick={() => handleUploadClick(type)}
        onDragOver={(e) => handleDragOver(e, type)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(type, e)}
      >
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-9 w-9" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          <span className="text-yellow-600 hover:text-yellow-500 font-medium">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          {type === 'PassportPhoto' ? 'JPG, PNG (Max 2MB)' : 'PNG, JPG up to 10MB'}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className=" max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Document Upload</h1>
        </div>

        {/* Document Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {fileTypes.map(({ key, label, description }) => (
            <motion.div
              key={key}
              variants={cardVariants}
              className="bg-white rounded-lg border border-yellow-200 overflow-hidden"
            >
              {/* Card Header */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{label}</h3>
                    {(files[key] || uploadedDocs[key]) && (
                      <span className="text-sm text-green-600 font-medium">verified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-3">{description}</p>

                {loadingDocs ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                  </div>
                ) : (
                  <>
                    {renderFileStatus(key, label)}

                    {/* Progress Bar */}
                    {isUploading[key] && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            className="bg-yellow-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress[key]}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-1">
                          Uploading... {uploadProgress[key]}%
                        </p>
                      </div>
                    )}

                    {/* Upload Status */}
                    {uploadStatus[key] && (
                      <div className={`mt-2 text-sm text-center font-medium ${uploadStatus[key].includes('success') ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {uploadStatus[key]}
                      </div>
                    )}
                  </>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                ref={inputRefs[key]}
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(key, e)}
              />
            </motion.div>
          ))}
        </motion.div>
        {/* Upload Guidelines */}
        <div className="mt-12 bg-white rounded-lg border border-yellow-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Guidelines</h3>
          <p className="text-gray-600 mb-4">Please follow these guidelines for successful document verification</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                <span className="text-green-500 mr-2">✓</span>
                Do's</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Upload clear, high-resolution images
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Ensure all text is readable
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Use good lighting when taking photos
                </li>
                <li className="flex items-start">
                 <span className="mr-2">•</span>
                  Keep documents flat and straight
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Upload original documents only
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                <span className="text-red-500 mr-2">✗</span>
                Don'ts</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Don't upload blurry or dark images
                </li>
                <li className="flex items-start">
                 <span className="mr-2">•</span>
                  Don't crop important information
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Don't upload photocopies
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Don't use filters or edit images
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Don't upload damaged documents
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {modal.open && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal({ open: false, type: null })}
            >
              <motion.div
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {fileTypes.find(f => f.key === modal.type)?.label} Preview
                    </h3>
                    <button
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                      onClick={() => setModal({ open: false, type: null })}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="p-6 max-h-[70vh] overflow-auto flex items-center justify-center">
                  {modalLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                    </div>
                  ) : modalUrl ? (
                    <img
                      src={modalUrl}
                      alt="Preview"
                      className="max-w-full max-h-[60vh] rounded-lg object-contain"
                    />
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No document available for preview
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      onClick={() => setModal({ open: false, type: null })}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomerFiles;