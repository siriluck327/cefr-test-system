/**
 * Web App URL of the Google Apps Script in apps-script/Code.gs (ends in /exec).
 * Set to '' to keep everything on the device only; see README "เก็บสถิติผู้เรียนลง Google Sheets".
 * The VITE_SHEET_API_URL environment variable overrides it at build time.
 */
export const SHEET_API_URL: string =
  (import.meta.env.VITE_SHEET_API_URL as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbwLp3g6SKZxizpQaMKLNXZAUrOUsiIwDBvXeKEH02gC92qfVO-xIiVFnOqIcVD4_176Qg/exec';
