import { getAuthorization } from "../utils/authentication.js";
import { toJson } from "../utils/xmlJsonUtil.js";
export default function client(that) {
  return {};
}

export async function callback(f, that) {
  try {
    const response = await f(that);
    return toJson(response.data);
  } catch (error) {
    const response = error.response;
    if (response && response.status === 401) {
      const authHeader = response.headers.get("www-authenticate");
      if (!authHeader) {
        throw new Error("Missing WWW-Authenticate header");
      }
      that.axiosOptions.headers.Authorization = getAuthorization(
        response,
        authHeader,
        that
      );
      const result = await f(that);
      return toJson(result.data);
    } else {
      throw new Error(error.message);
    }
  }
}
