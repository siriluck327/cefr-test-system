/**
 * Web App URL of the Google Apps Script in apps-script/Code.gs (ends in /exec).
 * Leave empty to keep everything on the device only; see README "เก็บสถิติผู้เรียนลง Google Sheets".
 * Can also be set at build time with the VITE_SHEET_API_URL environment variable.
 */
export const SHEET_API_URL: string = (import.meta.env.VITE_SHEET_API_URL as string | undefined) || '';
