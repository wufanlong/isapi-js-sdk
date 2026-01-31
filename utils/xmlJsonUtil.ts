import { XMLParser, XMLBuilder } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
  parseTagValue: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

/**
 * 判断是否为 XML 字符串
 */
function isXmlString(str) {
  return (
    typeof str === "string" &&
    str.trim().startsWith("<") &&
    str.trim().endsWith(">")
  );
}

/**
 * 判断是否为 JSON 字符串
 */
function isJsonString(str) {
  if (typeof str !== "string") return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 不管传入 XML / JSON / Object
 * 最终返回 JS Object
 */
export function toJson(input) {
  // 已经是 JS 对象
  if (typeof input === "object" && input !== null) {
    return input;
  }

  // XML 字符串
  if (isXmlString(input)) {
    return parser.parse(input);
  }

  // JSON 字符串
  if (isJsonString(input)) {
    return JSON.parse(input);
  }
  throw new Error("toJson: Unsupported input type: ", input);
}

/**
 * 不管传入 XML / JSON / Object
 * 最终返回 XML 字符串
 */
export function toXml(input) {
  // XML 字符串，直接返回（规范化一下也行）
  if (isXmlString(input)) {
    return input;
  }

  // JSON 字符串
  if (isJsonString(input)) {
    const obj = JSON.parse(input);
    return builder.build(obj);
  }

  // JS 对象
  if (typeof input === "object" && input !== null) {
    return builder.build(input);
  }

  throw new Error("toXml: Unsupported input type");
}
