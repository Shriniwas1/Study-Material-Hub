import crypto from "crypto";

export const generateCloudinarySignature = (params, apiSecret) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join("&");

  const stringToSign = `${sortedParams}${apiSecret}`;

  return crypto
    .createHash("sha1")
    .update(stringToSign)
    .digest("hex");
};