/** Single place for app attribution (shown in About + build metadata). */
export const APP_NAME = 'Wurlding';
export const APP_AUTHOR = 'Michael A Hernandez';
export const APP_VERSION = __APP_VERSION__;

const year = new Date().getFullYear();

export const COPYRIGHT = `© ${year} ${APP_AUTHOR}. All rights reserved.`;

/** Short proprietary notice — not a substitute for a lawyer-drafted EULA if you need one. */
export const PROPRIETARY_NOTICE =
  'This software is provided for your use under the terms you set for recipients. Unauthorized copying, redistribution, or resale may be prohibited.';
