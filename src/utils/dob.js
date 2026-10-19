// Date of birth can't be in the future. Used as the date picker's `max` and
// checked again on save for every Date of Birth field.
// Latest allowed date: today, local time (yyyy-mm-dd, compared as a string).
const now = new Date();
export const DOB_MAX = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
export const DOB_ERROR = "Date of birth can't be in the future.";

export const dobError = (v) => (v && String(v).slice(0, 10) > DOB_MAX ? DOB_ERROR : "");
