import _ from "lodash";
import { dump as yamlDump } from "js-yaml";
import { formatJson, formatJsonPretty } from './jsonFormatter.mjs';

// Helper functions
const formatPadString = (pad = 2): string => {
  if (_.isInteger(pad)) {
    return " ".repeat(pad as number);
  }
  if (_.isNil(pad)) {
    return "  ";
  }
  return pad.toString();
};

function getIndentSize(indent: unknown): number {
  if (typeof indent === 'number') {
    return indent;
  }
  if (typeof indent === 'string') {
    const parsed = parseInt(indent, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return 2; // default indentation
}

const multilinePad = (multilineStr: string, pad = 0): string => {
  if (!pad) {
    return multilineStr;
  }
  return multilineStr.replace(/^/gm, formatPadString(pad));
};

const padLeft = (value: string | number, length: number): string => 
  value.toString().padStart(length, "0");

const slackSafeString = (str: string): string => {
  if (!str || typeof str !== "string") {
    return str;
  }
  try {
    let escapedStr = str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    if (escapedStr.includes("_") || escapedStr.includes("*") || escapedStr.includes("~")) {
      escapedStr = `\`${escapedStr}\``;
    }
    if (escapedStr.includes("```")) {
      escapedStr = escapedStr.replace(/```/g, "<triple-back-tick>");
    }
    return escapedStr;
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
};

// AWS Region mapping
const awsRegion5Map: Record<string, string> = {
  "ap-northeast-1": "APNE1",
  "ap-northeast-2": "APNE2",
  "ap-south-1": "APSO1",
  "ap-southeast-1": "APSE1",
  "ap-southeast-2": "APSE2",
  "ca-central-1": "CACE1",
  "eu-central-1": "EUCE1",
  "eu-north-1": "EUNO1",
  "eu-west-1": "EUWE1",
  "eu-west-2": "EUWE2",
  "eu-west-3": "EUWE3",
  "sa-east-1": "SAEA1",
  "us-east-1": "USEA1",
  "us-east-2": "USEA2",
  "us-west-1": "USWE1",
  "us-west-2": "USWE2",
};

const awsRegion3Map: Record<string, string> = {
  "ap-northeast-1": "JPN",
  "ap-northeast-2": "KOR",
  "ap-south-1": "IND",
  "ap-southeast-1": "SGP",
  "ap-southeast-2": "ANS",
  "ca-central-1": "CAN",
  "eu-central-1": "DEU",
  "eu-north-1": "SWE",
  "eu-west-1": "IRL",
  "eu-west-2": "GBR",
  "eu-west-3": "FRA",
  "sa-east-1": "BRA",
  "us-east-1": "UVA",
  "us-east-2": "UOH",
  "us-west-1": "UCA",
  "us-west-2": "UOR",
};

const region = (inRegion: string): string => {
  switch (inRegion.length) {
    case 3:
      return _.invert(awsRegion3Map)[inRegion];
    case 5:
      return _.invert(awsRegion5Map)[inRegion];
    default:
      // Allow availability zones to be passed in for convenience
      for (const r in awsRegion3Map) {
        if (inRegion.indexOf(r) === 0) {
          return r;
        }
      }
      throw new Error(`Invalid region "${inRegion}" passed to utils.region`);
  }
};

const region3 = (inRegion: string): string => {
  switch (inRegion.length) {
    case 3:
      return inRegion;
    case 5:
      return region3(region(inRegion));
    default:
      return awsRegion3Map[region(inRegion)];
  }
};

const region5 = (inRegion: string): string => {
  switch (inRegion.length) {
    case 3:
      return region5(region(inRegion));
    case 5:
      return inRegion;
    default:
      return awsRegion5Map[region(inRegion)];
  }
};

const centrifyLinuxUidFromSid = (sid: string): number | null => {
  const re = /^S-1-5-\d{2}-\d+-(\d{4,10})-\d+-(\d+)$/;
  const matches = sid.match(re);
  if (!matches) {
    return null;
  }
  const securityIdBase10 = matches[1];
  const relativeIdBase10 = matches[2];

  const securityId = parseInt(securityIdBase10);
  const relativeId = parseInt(relativeIdBase10);
  const securityIdBase2 = securityId.toString(2);
  const relativeIdBase2 = relativeId.toString(2);
  const uidBase2String = securityIdBase2.slice(-9) + relativeIdBase2.slice(0, 22).padStart(22, "0");
  const uidBase2 = parseInt(uidBase2String, 2);
  return parseInt(uidBase2.toString(10));
};

// Helper for transformMap filter
const checkValue = (value: any, values: Record<string, any>, regexMatch: RegExp): any => {
  for (const v in values) {
    if (values[v].incorrectValues) {
      values[v].incorrectValues = values[v].incorrectValues.map((val: any) => val.toString());

      values[v].incorrectValues.forEach((incorrectValue: string) => {
        const startsWith = incorrectValue.startsWith("string:");
        if (regexMatch.test(incorrectValue) && !startsWith) {
          const patternMatch = regexMatch.exec(incorrectValue);
          if (patternMatch) {
            const regexInIncorrectValue = new RegExp(patternMatch[1], patternMatch[2]);
            if (regexInIncorrectValue.test(value)) {
              value = v;
            }
          }
        } else if (startsWith) {
          const actualIncorrectValue = incorrectValue.substring(7);
          if (actualIncorrectValue === value) {
            value = v;
          }
        } else if (incorrectValue === value) {
          value = v;
        }
      });
    }
  }
  return value;
};

// Export all filters
export const filters = {
  json: (obj: any, kwargs: Record<string, any> = {}) => {
    try {
      const str = formatJsonPretty(obj, getIndentSize(kwargs.indent));
      return multilinePad(str, kwargs.pad);
    } catch (e: any) {
      return formatJson({ error: e.message });
    }
  },

  ipOctet: (ipAddr: string, oneBasedOctetNum: number): string => {
    const ipParts = ipAddr.split(".");
    return ipParts[oneBasedOctetNum - 1];
  },

  ipOctetBase36Dec: (decOctetNum: number): string => {
    if (decOctetNum <= 99) {
      return padLeft(decOctetNum, 2);
    }
    const chars = "0123456789abcdefghijklmnop";
    return `${chars[Math.floor(decOctetNum / 10)]}${decOctetNum % 10}`;
  },

  transformMap: (data: Record<string, any>, rules: Record<string, any>): Record<string, any> => {
    const sortedDataKeys = Object.keys(data).sort();
    const sortedData: Record<string, any> = {};
    sortedDataKeys.forEach(key => { sortedData[key] = data[key]; });

    const transformMap: Record<string, any> = {};
    const regexMatch = new RegExp("^/((?:\\/|[^/])*)/([dgimsuy]*)$");

    for (const property in sortedData) {
      let value = sortedData[property];
      let foundMatchingRule = false;

      if (rules[property]) {
        foundMatchingRule = true;
        const ruleValues = rules[property].values;
        if (ruleValues) {
          value = checkValue(value, ruleValues, regexMatch);
        }
        transformMap[property] = value;
      } else {
        for (const key in rules) {
          if (rules[key].incorrectKeys) {
            rules[key].incorrectKeys = rules[key].incorrectKeys.map((k: any) => k.toString());

            rules[key].incorrectKeys.forEach((incorrectKey: string) => {
              const startsWith = incorrectKey.startsWith("string:");
              if (regexMatch.test(incorrectKey) && !startsWith) {
                const patternKeyMatch = regexMatch.exec(incorrectKey);
                if (patternKeyMatch) {
                  const regexInIncorrectKey = new RegExp(patternKeyMatch[1], patternKeyMatch[2]);
                  if (regexInIncorrectKey.test(property)) {
                    foundMatchingRule = true;
                  }
                }
              } else if (startsWith) {
                const actualIncorrectKey = incorrectKey.substring(7);
                if (actualIncorrectKey === property) {
                  foundMatchingRule = true;
                }
              } else if (incorrectKey === property) {
                foundMatchingRule = true;
              }
            });

            if (foundMatchingRule) {
              if (rules[key].replacementValue) {
                transformMap[property] = rules[key].replacementValue;
              } else {
                transformMap[property] = sortedData[property];
              }

              const ruleValues = rules[key].values;
              if (ruleValues) {
                for (const v in ruleValues) {
                  if (ruleValues[v].incorrectValues) {
                    value = checkValue(value, ruleValues, regexMatch);
                  }
                }
              }
              if (transformMap.hasOwnProperty(key)) {
                continue;
              }
              transformMap[key] = value;
              break;
            }
          }
        }
        if (!foundMatchingRule) {
          transformMap[property] = value;
        }
      }
    }
    return transformMap;
  },

  setAttribute: (dictionary: Record<string, any>, key: string, value: any): Record<string, any> => {
    dictionary[key] = value;
    return dictionary;
  },

  padLeft,
  region3,
  region5,

  yaml: (obj: any, kwargs: Record<string, any> = {}) => {
    const options = { sortKeys: true, skipInvalid: true, ...kwargs };
    const safeObj = _.pick(obj, Object.keys(obj));
    let str = yamlDump(safeObj, options);
    str = str.trim();
    return multilinePad(str, kwargs.pad);
  },

  alphanum: (str: string): string => str.replace(/\W/g, ""),

  date: (d: string | number, method = "toISOString"): string => {
    let workingDate: Date;
    if (+d === +d) {
      workingDate = new Date(+d);
    } else {
      workingDate = new Date(d);
    }
    switch (method) {
      case "toISOString":
        return workingDate.toISOString();
      case "toUTCString":
        return workingDate.toUTCString();
      case "toLocaleString":
        return workingDate.toLocaleString();
      case "toString":
        return workingDate.toString();
      default:
        return workingDate.toISOString();
    }
  },

  isString: _.isString,
  hex: (num: number): string => num.toString(16),
  slackSafeString,
  pascalCase: (str: string): string => {
    if (str.length === 0) {
      return "";
    }
    const camelCase = _.camelCase(str);
    return camelCase[0].toUpperCase() + camelCase.slice(1);
  },
  camelCase: _.camelCase,
  snakeCase: _.snakeCase,
  isArray: Array.isArray,
  sidToLinuxUid: centrifyLinuxUidFromSid,
}; 