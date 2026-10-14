"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/compression/node_modules/negotiator/lib/charset.js
var require_charset = __commonJS({
  "node_modules/compression/node_modules/negotiator/lib/charset.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredCharsets;
    module2.exports.preferredCharsets = preferredCharsets;
    var simpleCharsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
    function parseAcceptCharset(accept) {
      var accepts = accept.split(",");
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var charset = parseCharset(accepts[i].trim(), i);
        if (charset) {
          accepts[j++] = charset;
        }
      }
      accepts.length = j;
      return accepts;
    }
    function parseCharset(str, i) {
      var match = simpleCharsetRegExp.exec(str);
      if (!match) return null;
      var charset = match[1];
      var q = 1;
      if (match[2]) {
        var params = match[2].split(";");
        for (var j = 0; j < params.length; j++) {
          var p = params[j].trim().split("=");
          if (p[0] === "q") {
            q = parseFloat(p[1]);
            break;
          }
        }
      }
      return {
        charset,
        q,
        i
      };
    }
    function getCharsetPriority(charset, accepted, index) {
      var priority = { o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(charset, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(charset, spec, index) {
      var s = 0;
      if (spec.charset.toLowerCase() === charset.toLowerCase()) {
        s |= 1;
      } else if (spec.charset !== "*") {
        return null;
      }
      return {
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredCharsets(accept, provided) {
      var accepts = parseAcceptCharset(accept === void 0 ? "*" : accept || "");
      if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullCharset);
      }
      var priorities = provided.map(function getPriority(type, index) {
        return getCharsetPriority(type, accepts, index);
      });
      return priorities.filter(isQuality).sort(compareSpecs).map(function getCharset(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
    }
    function getFullCharset(spec) {
      return spec.charset;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
  }
});

// node_modules/compression/node_modules/negotiator/lib/encoding.js
var require_encoding = __commonJS({
  "node_modules/compression/node_modules/negotiator/lib/encoding.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredEncodings;
    module2.exports.preferredEncodings = preferredEncodings;
    var simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
    function parseAcceptEncoding(accept) {
      var accepts = accept.split(",");
      var hasIdentity = false;
      var minQuality = 1;
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var encoding = parseEncoding(accepts[i].trim(), i);
        if (encoding) {
          accepts[j++] = encoding;
          hasIdentity = hasIdentity || specify("identity", encoding);
          minQuality = Math.min(minQuality, encoding.q || 1);
        }
      }
      if (!hasIdentity) {
        accepts[j++] = {
          encoding: "identity",
          q: minQuality,
          i
        };
      }
      accepts.length = j;
      return accepts;
    }
    function parseEncoding(str, i) {
      var match = simpleEncodingRegExp.exec(str);
      if (!match) return null;
      var encoding = match[1];
      var q = 1;
      if (match[2]) {
        var params = match[2].split(";");
        for (var j = 0; j < params.length; j++) {
          var p = params[j].trim().split("=");
          if (p[0] === "q") {
            q = parseFloat(p[1]);
            break;
          }
        }
      }
      return {
        encoding,
        q,
        i
      };
    }
    function getEncodingPriority(encoding, accepted, index) {
      var priority = { encoding, o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(encoding, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(encoding, spec, index) {
      var s = 0;
      if (spec.encoding.toLowerCase() === encoding.toLowerCase()) {
        s |= 1;
      } else if (spec.encoding !== "*") {
        return null;
      }
      return {
        encoding,
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredEncodings(accept, provided, preferred) {
      var accepts = parseAcceptEncoding(accept || "");
      var comparator = preferred ? function comparator2(a, b) {
        if (a.q !== b.q) {
          return b.q - a.q;
        }
        var aPreferred = preferred.indexOf(a.encoding);
        var bPreferred = preferred.indexOf(b.encoding);
        if (aPreferred === -1 && bPreferred === -1) {
          return b.s - a.s || a.o - b.o || a.i - b.i;
        }
        if (aPreferred !== -1 && bPreferred !== -1) {
          return aPreferred - bPreferred;
        }
        return aPreferred === -1 ? 1 : -1;
      } : compareSpecs;
      if (!provided) {
        return accepts.filter(isQuality).sort(comparator).map(getFullEncoding);
      }
      var priorities = provided.map(function getPriority(type, index) {
        return getEncodingPriority(type, accepts, index);
      });
      return priorities.filter(isQuality).sort(comparator).map(function getEncoding(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i;
    }
    function getFullEncoding(spec) {
      return spec.encoding;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
  }
});

// node_modules/compression/node_modules/negotiator/lib/language.js
var require_language = __commonJS({
  "node_modules/compression/node_modules/negotiator/lib/language.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredLanguages;
    module2.exports.preferredLanguages = preferredLanguages;
    var simpleLanguageRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
    function parseAcceptLanguage(accept) {
      var accepts = accept.split(",");
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var language = parseLanguage(accepts[i].trim(), i);
        if (language) {
          accepts[j++] = language;
        }
      }
      accepts.length = j;
      return accepts;
    }
    function parseLanguage(str, i) {
      var match = simpleLanguageRegExp.exec(str);
      if (!match) return null;
      var prefix = match[1];
      var suffix = match[2];
      var full = prefix;
      if (suffix) full += "-" + suffix;
      var q = 1;
      if (match[3]) {
        var params = match[3].split(";");
        for (var j = 0; j < params.length; j++) {
          var p = params[j].split("=");
          if (p[0] === "q") q = parseFloat(p[1]);
        }
      }
      return {
        prefix,
        suffix,
        q,
        i,
        full
      };
    }
    function getLanguagePriority(language, accepted, index) {
      var priority = { o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(language, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(language, spec, index) {
      var p = parseLanguage(language);
      if (!p) return null;
      var s = 0;
      if (spec.full.toLowerCase() === p.full.toLowerCase()) {
        s |= 4;
      } else if (spec.prefix.toLowerCase() === p.full.toLowerCase()) {
        s |= 2;
      } else if (spec.full.toLowerCase() === p.prefix.toLowerCase()) {
        s |= 1;
      } else if (spec.full !== "*") {
        return null;
      }
      return {
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredLanguages(accept, provided) {
      var accepts = parseAcceptLanguage(accept === void 0 ? "*" : accept || "");
      if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullLanguage);
      }
      var priorities = provided.map(function getPriority(type, index) {
        return getLanguagePriority(type, accepts, index);
      });
      return priorities.filter(isQuality).sort(compareSpecs).map(function getLanguage(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
    }
    function getFullLanguage(spec) {
      return spec.full;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
  }
});

// node_modules/compression/node_modules/negotiator/lib/mediaType.js
var require_mediaType = __commonJS({
  "node_modules/compression/node_modules/negotiator/lib/mediaType.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredMediaTypes;
    module2.exports.preferredMediaTypes = preferredMediaTypes;
    var simpleMediaTypeRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
    function parseAccept(accept) {
      var accepts = splitMediaTypes(accept);
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var mediaType = parseMediaType(accepts[i].trim(), i);
        if (mediaType) {
          accepts[j++] = mediaType;
        }
      }
      accepts.length = j;
      return accepts;
    }
    function parseMediaType(str, i) {
      var match = simpleMediaTypeRegExp.exec(str);
      if (!match) return null;
      var params = /* @__PURE__ */ Object.create(null);
      var q = 1;
      var subtype = match[2];
      var type = match[1];
      if (match[3]) {
        var kvps = splitParameters(match[3]).map(splitKeyValuePair);
        for (var j = 0; j < kvps.length; j++) {
          var pair = kvps[j];
          var key = pair[0].toLowerCase();
          var val = pair[1];
          var value = val && val[0] === '"' && val[val.length - 1] === '"' ? val.slice(1, -1) : val;
          if (key === "q") {
            q = parseFloat(value);
            break;
          }
          params[key] = value;
        }
      }
      return {
        type,
        subtype,
        params,
        q,
        i
      };
    }
    function getMediaTypePriority(type, accepted, index) {
      var priority = { o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(type, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(type, spec, index) {
      var p = parseMediaType(type);
      var s = 0;
      if (!p) {
        return null;
      }
      if (spec.type.toLowerCase() == p.type.toLowerCase()) {
        s |= 4;
      } else if (spec.type != "*") {
        return null;
      }
      if (spec.subtype.toLowerCase() == p.subtype.toLowerCase()) {
        s |= 2;
      } else if (spec.subtype != "*") {
        return null;
      }
      var keys = Object.keys(spec.params);
      if (keys.length > 0) {
        if (keys.every(function(k) {
          return spec.params[k] == "*" || (spec.params[k] || "").toLowerCase() == (p.params[k] || "").toLowerCase();
        })) {
          s |= 1;
        } else {
          return null;
        }
      }
      return {
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredMediaTypes(accept, provided) {
      var accepts = parseAccept(accept === void 0 ? "*/*" : accept || "");
      if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullType);
      }
      var priorities = provided.map(function getPriority(type, index) {
        return getMediaTypePriority(type, accepts, index);
      });
      return priorities.filter(isQuality).sort(compareSpecs).map(function getType(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
    }
    function getFullType(spec) {
      return spec.type + "/" + spec.subtype;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
    function quoteCount(string) {
      var count = 0;
      var index = 0;
      while ((index = string.indexOf('"', index)) !== -1) {
        count++;
        index++;
      }
      return count;
    }
    function splitKeyValuePair(str) {
      var index = str.indexOf("=");
      var key;
      var val;
      if (index === -1) {
        key = str;
      } else {
        key = str.slice(0, index);
        val = str.slice(index + 1);
      }
      return [key, val];
    }
    function splitMediaTypes(accept) {
      var accepts = accept.split(",");
      for (var i = 1, j = 0; i < accepts.length; i++) {
        if (quoteCount(accepts[j]) % 2 == 0) {
          accepts[++j] = accepts[i];
        } else {
          accepts[j] += "," + accepts[i];
        }
      }
      accepts.length = j + 1;
      return accepts;
    }
    function splitParameters(str) {
      var parameters = str.split(";");
      for (var i = 1, j = 0; i < parameters.length; i++) {
        if (quoteCount(parameters[j]) % 2 == 0) {
          parameters[++j] = parameters[i];
        } else {
          parameters[j] += ";" + parameters[i];
        }
      }
      parameters.length = j + 1;
      for (var i = 0; i < parameters.length; i++) {
        parameters[i] = parameters[i].trim();
      }
      return parameters;
    }
  }
});

// node_modules/compression/node_modules/negotiator/index.js
var require_negotiator = __commonJS({
  "node_modules/compression/node_modules/negotiator/index.js"(exports2, module2) {
    "use strict";
    var preferredCharsets = require_charset();
    var preferredEncodings = require_encoding();
    var preferredLanguages = require_language();
    var preferredMediaTypes = require_mediaType();
    module2.exports = Negotiator;
    module2.exports.Negotiator = Negotiator;
    function Negotiator(request) {
      if (!(this instanceof Negotiator)) {
        return new Negotiator(request);
      }
      this.request = request;
    }
    Negotiator.prototype.charset = function charset(available) {
      var set = this.charsets(available);
      return set && set[0];
    };
    Negotiator.prototype.charsets = function charsets(available) {
      return preferredCharsets(this.request.headers["accept-charset"], available);
    };
    Negotiator.prototype.encoding = function encoding(available, preferred) {
      var set = this.encodings(available, preferred);
      return set && set[0];
    };
    Negotiator.prototype.encodings = function encodings(available, preferred) {
      return preferredEncodings(this.request.headers["accept-encoding"], available, preferred);
    };
    Negotiator.prototype.language = function language(available) {
      var set = this.languages(available);
      return set && set[0];
    };
    Negotiator.prototype.languages = function languages(available) {
      return preferredLanguages(this.request.headers["accept-language"], available);
    };
    Negotiator.prototype.mediaType = function mediaType(available) {
      var set = this.mediaTypes(available);
      return set && set[0];
    };
    Negotiator.prototype.mediaTypes = function mediaTypes(available) {
      return preferredMediaTypes(this.request.headers.accept, available);
    };
    Negotiator.prototype.preferredCharset = Negotiator.prototype.charset;
    Negotiator.prototype.preferredCharsets = Negotiator.prototype.charsets;
    Negotiator.prototype.preferredEncoding = Negotiator.prototype.encoding;
    Negotiator.prototype.preferredEncodings = Negotiator.prototype.encodings;
    Negotiator.prototype.preferredLanguage = Negotiator.prototype.language;
    Negotiator.prototype.preferredLanguages = Negotiator.prototype.languages;
    Negotiator.prototype.preferredMediaType = Negotiator.prototype.mediaType;
    Negotiator.prototype.preferredMediaTypes = Negotiator.prototype.mediaTypes;
  }
});

// node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/safe-buffer/index.js"(exports2, module2) {
    var buffer = require("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module2.exports = buffer;
    } else {
      copyProps(buffer, exports2);
      exports2.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/bytes/index.js
var require_bytes = __commonJS({
  "node_modules/bytes/index.js"(exports2, module2) {
    "use strict";
    module2.exports = bytes;
    module2.exports.format = format;
    module2.exports.parse = parse;
    var formatThousandsRegExp = /\B(?=(\d{3})+(?!\d))/g;
    var formatDecimalsRegExp = /(?:\.0*|(\.[^0]+)0+)$/;
    var map = {
      b: 1,
      kb: 1 << 10,
      mb: 1 << 20,
      gb: 1 << 30,
      tb: Math.pow(1024, 4),
      pb: Math.pow(1024, 5)
    };
    var parseRegExp = /^((-|\+)?(\d+(?:\.\d+)?)) *(kb|mb|gb|tb|pb)$/i;
    function bytes(value, options) {
      if (typeof value === "string") {
        return parse(value);
      }
      if (typeof value === "number") {
        return format(value, options);
      }
      return null;
    }
    function format(value, options) {
      if (!Number.isFinite(value)) {
        return null;
      }
      var mag = Math.abs(value);
      var thousandsSeparator = options && options.thousandsSeparator || "";
      var unitSeparator = options && options.unitSeparator || "";
      var decimalPlaces = options && options.decimalPlaces !== void 0 ? options.decimalPlaces : 2;
      var fixedDecimals = Boolean(options && options.fixedDecimals);
      var unit = options && options.unit || "";
      if (!unit || !map[unit.toLowerCase()]) {
        if (mag >= map.pb) {
          unit = "PB";
        } else if (mag >= map.tb) {
          unit = "TB";
        } else if (mag >= map.gb) {
          unit = "GB";
        } else if (mag >= map.mb) {
          unit = "MB";
        } else if (mag >= map.kb) {
          unit = "KB";
        } else {
          unit = "B";
        }
      }
      var val = value / map[unit.toLowerCase()];
      var str = val.toFixed(decimalPlaces);
      if (!fixedDecimals) {
        str = str.replace(formatDecimalsRegExp, "$1");
      }
      if (thousandsSeparator) {
        str = str.split(".").map(function(s, i) {
          return i === 0 ? s.replace(formatThousandsRegExp, thousandsSeparator) : s;
        }).join(".");
      }
      return str + unitSeparator + unit;
    }
    function parse(val) {
      if (typeof val === "number" && !isNaN(val)) {
        return val;
      }
      if (typeof val !== "string") {
        return null;
      }
      var results = parseRegExp.exec(val);
      var floatValue;
      var unit = "b";
      if (!results) {
        floatValue = parseInt(val, 10);
        unit = "b";
      } else {
        floatValue = parseFloat(results[1]);
        unit = results[4].toLowerCase();
      }
      if (isNaN(floatValue)) {
        return null;
      }
      return Math.floor(map[unit] * floatValue);
    }
  }
});

// node_modules/mime-db/db.json
var require_db = __commonJS({
  "node_modules/mime-db/db.json"(exports2, module2) {
    module2.exports = {
      "application/1d-interleaved-parityfec": {
        source: "iana"
      },
      "application/3gpdash-qoe-report+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/3gpp-ims+xml": {
        source: "iana",
        compressible: true
      },
      "application/3gpphal+json": {
        source: "iana",
        compressible: true
      },
      "application/3gpphalforms+json": {
        source: "iana",
        compressible: true
      },
      "application/a2l": {
        source: "iana"
      },
      "application/ace+cbor": {
        source: "iana"
      },
      "application/ace+json": {
        source: "iana",
        compressible: true
      },
      "application/ace-groupcomm+cbor": {
        source: "iana"
      },
      "application/ace-trl+cbor": {
        source: "iana"
      },
      "application/activemessage": {
        source: "iana"
      },
      "application/activity+json": {
        source: "iana",
        compressible: true
      },
      "application/aif+cbor": {
        source: "iana"
      },
      "application/aif+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-cdni+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-cdnifilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-directory+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcost+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcostparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointprop+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointpropparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-error+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-propmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-propmapparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-tips+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-tipsparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamcontrol+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamparams+json": {
        source: "iana",
        compressible: true
      },
      "application/aml": {
        source: "iana"
      },
      "application/andrew-inset": {
        source: "iana",
        extensions: ["ez"]
      },
      "application/appinstaller": {
        compressible: false,
        extensions: ["appinstaller"]
      },
      "application/applefile": {
        source: "iana"
      },
      "application/applixware": {
        source: "apache",
        extensions: ["aw"]
      },
      "application/appx": {
        compressible: false,
        extensions: ["appx"]
      },
      "application/appxbundle": {
        compressible: false,
        extensions: ["appxbundle"]
      },
      "application/at+jwt": {
        source: "iana"
      },
      "application/atf": {
        source: "iana"
      },
      "application/atfx": {
        source: "iana"
      },
      "application/atom+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atom"]
      },
      "application/atomcat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomcat"]
      },
      "application/atomdeleted+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomdeleted"]
      },
      "application/atomicmail": {
        source: "iana"
      },
      "application/atomsvc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomsvc"]
      },
      "application/atsc-dwd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dwd"]
      },
      "application/atsc-dynamic-event-message": {
        source: "iana"
      },
      "application/atsc-held+xml": {
        source: "iana",
        compressible: true,
        extensions: ["held"]
      },
      "application/atsc-rdt+json": {
        source: "iana",
        compressible: true
      },
      "application/atsc-rsat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsat"]
      },
      "application/atxml": {
        source: "iana"
      },
      "application/auth-policy+xml": {
        source: "iana",
        compressible: true
      },
      "application/automationml-aml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["aml"]
      },
      "application/automationml-amlx+zip": {
        source: "iana",
        compressible: false,
        extensions: ["amlx"]
      },
      "application/bacnet-xdd+zip": {
        source: "iana",
        compressible: false
      },
      "application/batch-smtp": {
        source: "iana"
      },
      "application/bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/beep+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/bufr": {
        source: "iana"
      },
      "application/c2pa": {
        source: "iana"
      },
      "application/calendar+json": {
        source: "iana",
        compressible: true
      },
      "application/calendar+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xcs"]
      },
      "application/call-completion": {
        source: "iana"
      },
      "application/cals-1840": {
        source: "iana"
      },
      "application/captive+json": {
        source: "iana",
        compressible: true
      },
      "application/cbor": {
        source: "iana"
      },
      "application/cbor-seq": {
        source: "iana"
      },
      "application/cccex": {
        source: "iana"
      },
      "application/ccmp+xml": {
        source: "iana",
        compressible: true
      },
      "application/ccxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ccxml"]
      },
      "application/cda+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/cdfx+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdfx"]
      },
      "application/cdmi-capability": {
        source: "iana",
        extensions: ["cdmia"]
      },
      "application/cdmi-container": {
        source: "iana",
        extensions: ["cdmic"]
      },
      "application/cdmi-domain": {
        source: "iana",
        extensions: ["cdmid"]
      },
      "application/cdmi-object": {
        source: "iana",
        extensions: ["cdmio"]
      },
      "application/cdmi-queue": {
        source: "iana",
        extensions: ["cdmiq"]
      },
      "application/cdni": {
        source: "iana"
      },
      "application/ce+cbor": {
        source: "iana"
      },
      "application/cea": {
        source: "iana"
      },
      "application/cea-2018+xml": {
        source: "iana",
        compressible: true
      },
      "application/cellml+xml": {
        source: "iana",
        compressible: true
      },
      "application/cfw": {
        source: "iana"
      },
      "application/cid-edhoc+cbor-seq": {
        source: "iana"
      },
      "application/city+json": {
        source: "iana",
        compressible: true
      },
      "application/city+json-seq": {
        source: "iana"
      },
      "application/clr": {
        source: "iana"
      },
      "application/clue+xml": {
        source: "iana",
        compressible: true
      },
      "application/clue_info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cms": {
        source: "iana"
      },
      "application/cnrp+xml": {
        source: "iana",
        compressible: true
      },
      "application/coap-eap": {
        source: "iana"
      },
      "application/coap-group+json": {
        source: "iana",
        compressible: true
      },
      "application/coap-payload": {
        source: "iana"
      },
      "application/commonground": {
        source: "iana"
      },
      "application/concise-problem-details+cbor": {
        source: "iana"
      },
      "application/conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cose": {
        source: "iana"
      },
      "application/cose-key": {
        source: "iana"
      },
      "application/cose-key-set": {
        source: "iana"
      },
      "application/cose-x509": {
        source: "iana"
      },
      "application/cpl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cpl"]
      },
      "application/csrattrs": {
        source: "iana"
      },
      "application/csta+xml": {
        source: "iana",
        compressible: true
      },
      "application/cstadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/csvm+json": {
        source: "iana",
        compressible: true
      },
      "application/cu-seeme": {
        source: "apache",
        extensions: ["cu"]
      },
      "application/cwl": {
        source: "iana",
        extensions: ["cwl"]
      },
      "application/cwl+json": {
        source: "iana",
        compressible: true
      },
      "application/cwl+yaml": {
        source: "iana"
      },
      "application/cwt": {
        source: "iana"
      },
      "application/cybercash": {
        source: "iana"
      },
      "application/dart": {
        compressible: true
      },
      "application/dash+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpd"]
      },
      "application/dash-patch+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpp"]
      },
      "application/dashdelta": {
        source: "iana"
      },
      "application/davmount+xml": {
        source: "iana",
        compressible: true,
        extensions: ["davmount"]
      },
      "application/dca-rft": {
        source: "iana"
      },
      "application/dcd": {
        source: "iana"
      },
      "application/dec-dx": {
        source: "iana"
      },
      "application/dialog-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/dicom": {
        source: "iana",
        extensions: ["dcm"]
      },
      "application/dicom+json": {
        source: "iana",
        compressible: true
      },
      "application/dicom+xml": {
        source: "iana",
        compressible: true
      },
      "application/dii": {
        source: "iana"
      },
      "application/dit": {
        source: "iana"
      },
      "application/dns": {
        source: "iana"
      },
      "application/dns+json": {
        source: "iana",
        compressible: true
      },
      "application/dns-message": {
        source: "iana"
      },
      "application/docbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dbk"]
      },
      "application/dots+cbor": {
        source: "iana"
      },
      "application/dpop+jwt": {
        source: "iana"
      },
      "application/dskpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/dssc+der": {
        source: "iana",
        extensions: ["dssc"]
      },
      "application/dssc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdssc"]
      },
      "application/dvcs": {
        source: "iana"
      },
      "application/eat+cwt": {
        source: "iana"
      },
      "application/eat+jwt": {
        source: "iana"
      },
      "application/eat-bun+cbor": {
        source: "iana"
      },
      "application/eat-bun+json": {
        source: "iana",
        compressible: true
      },
      "application/eat-ucs+cbor": {
        source: "iana"
      },
      "application/eat-ucs+json": {
        source: "iana",
        compressible: true
      },
      "application/ecmascript": {
        source: "apache",
        compressible: true,
        extensions: ["ecma"]
      },
      "application/edhoc+cbor-seq": {
        source: "iana"
      },
      "application/edi-consent": {
        source: "iana"
      },
      "application/edi-x12": {
        source: "iana",
        compressible: false
      },
      "application/edifact": {
        source: "iana",
        compressible: false
      },
      "application/efi": {
        source: "iana"
      },
      "application/elm+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/elm+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.cap+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/emergencycalldata.comment+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.control+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.deviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.ecall.msd": {
        source: "iana"
      },
      "application/emergencycalldata.legacyesn+json": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.providerinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.serviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.subscriberinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.veds+xml": {
        source: "iana",
        compressible: true
      },
      "application/emma+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emma"]
      },
      "application/emotionml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emotionml"]
      },
      "application/encaprtp": {
        source: "iana"
      },
      "application/entity-statement+jwt": {
        source: "iana"
      },
      "application/epp+xml": {
        source: "iana",
        compressible: true
      },
      "application/epub+zip": {
        source: "iana",
        compressible: false,
        extensions: ["epub"]
      },
      "application/eshop": {
        source: "iana"
      },
      "application/exi": {
        source: "iana",
        extensions: ["exi"]
      },
      "application/expect-ct-report+json": {
        source: "iana",
        compressible: true
      },
      "application/express": {
        source: "iana",
        extensions: ["exp"]
      },
      "application/fastinfoset": {
        source: "iana"
      },
      "application/fastsoap": {
        source: "iana"
      },
      "application/fdf": {
        source: "iana",
        extensions: ["fdf"]
      },
      "application/fdt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fdt"]
      },
      "application/fhir+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fhir+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fido.trusted-apps+json": {
        compressible: true
      },
      "application/fits": {
        source: "iana"
      },
      "application/flexfec": {
        source: "iana"
      },
      "application/font-sfnt": {
        source: "iana"
      },
      "application/font-tdpfr": {
        source: "iana",
        extensions: ["pfr"]
      },
      "application/font-woff": {
        source: "iana",
        compressible: false
      },
      "application/framework-attributes+xml": {
        source: "iana",
        compressible: true
      },
      "application/geo+json": {
        source: "iana",
        compressible: true,
        extensions: ["geojson"]
      },
      "application/geo+json-seq": {
        source: "iana"
      },
      "application/geopackage+sqlite3": {
        source: "iana"
      },
      "application/geopose+json": {
        source: "iana",
        compressible: true
      },
      "application/geoxacml+json": {
        source: "iana",
        compressible: true
      },
      "application/geoxacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/gltf-buffer": {
        source: "iana"
      },
      "application/gml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["gml"]
      },
      "application/gnap-binding-jws": {
        source: "iana"
      },
      "application/gnap-binding-jwsd": {
        source: "iana"
      },
      "application/gnap-binding-rotation-jws": {
        source: "iana"
      },
      "application/gnap-binding-rotation-jwsd": {
        source: "iana"
      },
      "application/gpx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["gpx"]
      },
      "application/grib": {
        source: "iana"
      },
      "application/gxf": {
        source: "apache",
        extensions: ["gxf"]
      },
      "application/gzip": {
        source: "iana",
        compressible: false,
        extensions: ["gz"]
      },
      "application/h224": {
        source: "iana"
      },
      "application/held+xml": {
        source: "iana",
        compressible: true
      },
      "application/hjson": {
        extensions: ["hjson"]
      },
      "application/hl7v2+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/http": {
        source: "iana"
      },
      "application/hyperstudio": {
        source: "iana",
        extensions: ["stk"]
      },
      "application/ibe-key-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pkg-reply+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pp-data": {
        source: "iana"
      },
      "application/iges": {
        source: "iana"
      },
      "application/im-iscomposing+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/index": {
        source: "iana"
      },
      "application/index.cmd": {
        source: "iana"
      },
      "application/index.obj": {
        source: "iana"
      },
      "application/index.response": {
        source: "iana"
      },
      "application/index.vnd": {
        source: "iana"
      },
      "application/inkml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ink", "inkml"]
      },
      "application/iotp": {
        source: "iana"
      },
      "application/ipfix": {
        source: "iana",
        extensions: ["ipfix"]
      },
      "application/ipp": {
        source: "iana"
      },
      "application/isup": {
        source: "iana"
      },
      "application/its+xml": {
        source: "iana",
        compressible: true,
        extensions: ["its"]
      },
      "application/java-archive": {
        source: "iana",
        compressible: false,
        extensions: ["jar", "war", "ear"]
      },
      "application/java-serialized-object": {
        source: "apache",
        compressible: false,
        extensions: ["ser"]
      },
      "application/java-vm": {
        source: "apache",
        compressible: false,
        extensions: ["class"]
      },
      "application/javascript": {
        source: "apache",
        charset: "UTF-8",
        compressible: true,
        extensions: ["js"]
      },
      "application/jf2feed+json": {
        source: "iana",
        compressible: true
      },
      "application/jose": {
        source: "iana"
      },
      "application/jose+json": {
        source: "iana",
        compressible: true
      },
      "application/jrd+json": {
        source: "iana",
        compressible: true
      },
      "application/jscalendar+json": {
        source: "iana",
        compressible: true
      },
      "application/jscontact+json": {
        source: "iana",
        compressible: true
      },
      "application/json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["json", "map"]
      },
      "application/json-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/json-seq": {
        source: "iana"
      },
      "application/json5": {
        extensions: ["json5"]
      },
      "application/jsonml+json": {
        source: "apache",
        compressible: true,
        extensions: ["jsonml"]
      },
      "application/jsonpath": {
        source: "iana"
      },
      "application/jwk+json": {
        source: "iana",
        compressible: true
      },
      "application/jwk-set+json": {
        source: "iana",
        compressible: true
      },
      "application/jwk-set+jwt": {
        source: "iana"
      },
      "application/jwt": {
        source: "iana"
      },
      "application/kpml-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/kpml-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/ld+json": {
        source: "iana",
        compressible: true,
        extensions: ["jsonld"]
      },
      "application/lgr+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lgr"]
      },
      "application/link-format": {
        source: "iana"
      },
      "application/linkset": {
        source: "iana"
      },
      "application/linkset+json": {
        source: "iana",
        compressible: true
      },
      "application/load-control+xml": {
        source: "iana",
        compressible: true
      },
      "application/logout+jwt": {
        source: "iana"
      },
      "application/lost+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lostxml"]
      },
      "application/lostsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/lpf+zip": {
        source: "iana",
        compressible: false
      },
      "application/lxf": {
        source: "iana"
      },
      "application/mac-binhex40": {
        source: "iana",
        extensions: ["hqx"]
      },
      "application/mac-compactpro": {
        source: "apache",
        extensions: ["cpt"]
      },
      "application/macwriteii": {
        source: "iana"
      },
      "application/mads+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mads"]
      },
      "application/manifest+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["webmanifest"]
      },
      "application/marc": {
        source: "iana",
        extensions: ["mrc"]
      },
      "application/marcxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mrcx"]
      },
      "application/mathematica": {
        source: "iana",
        extensions: ["ma", "nb", "mb"]
      },
      "application/mathml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mathml"]
      },
      "application/mathml-content+xml": {
        source: "iana",
        compressible: true
      },
      "application/mathml-presentation+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-associated-procedure-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-deregister+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-envelope+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-protection-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-reception-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-schedule+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-user-service-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbox": {
        source: "iana",
        extensions: ["mbox"]
      },
      "application/media-policy-dataset+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpf"]
      },
      "application/media_control+xml": {
        source: "iana",
        compressible: true
      },
      "application/mediaservercontrol+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mscml"]
      },
      "application/merge-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/metalink+xml": {
        source: "apache",
        compressible: true,
        extensions: ["metalink"]
      },
      "application/metalink4+xml": {
        source: "iana",
        compressible: true,
        extensions: ["meta4"]
      },
      "application/mets+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mets"]
      },
      "application/mf4": {
        source: "iana"
      },
      "application/mikey": {
        source: "iana"
      },
      "application/mipc": {
        source: "iana"
      },
      "application/missing-blocks+cbor-seq": {
        source: "iana"
      },
      "application/mmt-aei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["maei"]
      },
      "application/mmt-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musd"]
      },
      "application/mods+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mods"]
      },
      "application/moss-keys": {
        source: "iana"
      },
      "application/moss-signature": {
        source: "iana"
      },
      "application/mosskey-data": {
        source: "iana"
      },
      "application/mosskey-request": {
        source: "iana"
      },
      "application/mp21": {
        source: "iana",
        extensions: ["m21", "mp21"]
      },
      "application/mp4": {
        source: "iana",
        extensions: ["mp4", "mpg4", "mp4s", "m4p"]
      },
      "application/mpeg4-generic": {
        source: "iana"
      },
      "application/mpeg4-iod": {
        source: "iana"
      },
      "application/mpeg4-iod-xmt": {
        source: "iana"
      },
      "application/mrb-consumer+xml": {
        source: "iana",
        compressible: true
      },
      "application/mrb-publish+xml": {
        source: "iana",
        compressible: true
      },
      "application/msc-ivr+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msc-mixer+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msix": {
        compressible: false,
        extensions: ["msix"]
      },
      "application/msixbundle": {
        compressible: false,
        extensions: ["msixbundle"]
      },
      "application/msword": {
        source: "iana",
        compressible: false,
        extensions: ["doc", "dot"]
      },
      "application/mud+json": {
        source: "iana",
        compressible: true
      },
      "application/multipart-core": {
        source: "iana"
      },
      "application/mxf": {
        source: "iana",
        extensions: ["mxf"]
      },
      "application/n-quads": {
        source: "iana",
        extensions: ["nq"]
      },
      "application/n-triples": {
        source: "iana",
        extensions: ["nt"]
      },
      "application/nasdata": {
        source: "iana"
      },
      "application/news-checkgroups": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-groupinfo": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-transmission": {
        source: "iana"
      },
      "application/nlsml+xml": {
        source: "iana",
        compressible: true
      },
      "application/node": {
        source: "iana",
        extensions: ["cjs"]
      },
      "application/nss": {
        source: "iana"
      },
      "application/oauth-authz-req+jwt": {
        source: "iana"
      },
      "application/oblivious-dns-message": {
        source: "iana"
      },
      "application/ocsp-request": {
        source: "iana"
      },
      "application/ocsp-response": {
        source: "iana"
      },
      "application/octet-stream": {
        source: "iana",
        compressible: true,
        extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
      },
      "application/oda": {
        source: "iana",
        extensions: ["oda"]
      },
      "application/odm+xml": {
        source: "iana",
        compressible: true
      },
      "application/odx": {
        source: "iana"
      },
      "application/oebps-package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["opf"]
      },
      "application/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogx"]
      },
      "application/ohttp-keys": {
        source: "iana"
      },
      "application/omdoc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["omdoc"]
      },
      "application/onenote": {
        source: "apache",
        extensions: ["onetoc", "onetoc2", "onetmp", "onepkg", "one", "onea"]
      },
      "application/opc-nodeset+xml": {
        source: "iana",
        compressible: true
      },
      "application/oscore": {
        source: "iana"
      },
      "application/oxps": {
        source: "iana",
        extensions: ["oxps"]
      },
      "application/p21": {
        source: "iana"
      },
      "application/p21+zip": {
        source: "iana",
        compressible: false
      },
      "application/p2p-overlay+xml": {
        source: "iana",
        compressible: true,
        extensions: ["relo"]
      },
      "application/parityfec": {
        source: "iana"
      },
      "application/passport": {
        source: "iana"
      },
      "application/patch-ops-error+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xer"]
      },
      "application/pdf": {
        source: "iana",
        compressible: false,
        extensions: ["pdf"]
      },
      "application/pdx": {
        source: "iana"
      },
      "application/pem-certificate-chain": {
        source: "iana"
      },
      "application/pgp-encrypted": {
        source: "iana",
        compressible: false,
        extensions: ["pgp"]
      },
      "application/pgp-keys": {
        source: "iana",
        extensions: ["asc"]
      },
      "application/pgp-signature": {
        source: "iana",
        extensions: ["sig", "asc"]
      },
      "application/pics-rules": {
        source: "apache",
        extensions: ["prf"]
      },
      "application/pidf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pidf-diff+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pkcs10": {
        source: "iana",
        extensions: ["p10"]
      },
      "application/pkcs12": {
        source: "iana"
      },
      "application/pkcs7-mime": {
        source: "iana",
        extensions: ["p7m", "p7c"]
      },
      "application/pkcs7-signature": {
        source: "iana",
        extensions: ["p7s"]
      },
      "application/pkcs8": {
        source: "iana",
        extensions: ["p8"]
      },
      "application/pkcs8-encrypted": {
        source: "iana"
      },
      "application/pkix-attr-cert": {
        source: "iana",
        extensions: ["ac"]
      },
      "application/pkix-cert": {
        source: "iana",
        extensions: ["cer"]
      },
      "application/pkix-crl": {
        source: "iana",
        extensions: ["crl"]
      },
      "application/pkix-pkipath": {
        source: "iana",
        extensions: ["pkipath"]
      },
      "application/pkixcmp": {
        source: "iana",
        extensions: ["pki"]
      },
      "application/pls+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pls"]
      },
      "application/poc-settings+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/postscript": {
        source: "iana",
        compressible: true,
        extensions: ["ai", "eps", "ps"]
      },
      "application/ppsp-tracker+json": {
        source: "iana",
        compressible: true
      },
      "application/private-token-issuer-directory": {
        source: "iana"
      },
      "application/private-token-request": {
        source: "iana"
      },
      "application/private-token-response": {
        source: "iana"
      },
      "application/problem+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+xml": {
        source: "iana",
        compressible: true
      },
      "application/provenance+xml": {
        source: "iana",
        compressible: true,
        extensions: ["provx"]
      },
      "application/provided-claims+jwt": {
        source: "iana"
      },
      "application/prs.alvestrand.titrax-sheet": {
        source: "iana"
      },
      "application/prs.cww": {
        source: "iana",
        extensions: ["cww"]
      },
      "application/prs.cyn": {
        source: "iana",
        charset: "7-BIT"
      },
      "application/prs.hpub+zip": {
        source: "iana",
        compressible: false
      },
      "application/prs.implied-document+xml": {
        source: "iana",
        compressible: true
      },
      "application/prs.implied-executable": {
        source: "iana"
      },
      "application/prs.implied-object+json": {
        source: "iana",
        compressible: true
      },
      "application/prs.implied-object+json-seq": {
        source: "iana"
      },
      "application/prs.implied-object+yaml": {
        source: "iana"
      },
      "application/prs.implied-structure": {
        source: "iana"
      },
      "application/prs.mayfile": {
        source: "iana"
      },
      "application/prs.nprend": {
        source: "iana"
      },
      "application/prs.plucker": {
        source: "iana"
      },
      "application/prs.rdf-xml-crypt": {
        source: "iana"
      },
      "application/prs.vcfbzip2": {
        source: "iana"
      },
      "application/prs.xsf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xsf"]
      },
      "application/pskc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pskcxml"]
      },
      "application/pvd+json": {
        source: "iana",
        compressible: true
      },
      "application/qsig": {
        source: "iana"
      },
      "application/raml+yaml": {
        compressible: true,
        extensions: ["raml"]
      },
      "application/raptorfec": {
        source: "iana"
      },
      "application/rdap+json": {
        source: "iana",
        compressible: true
      },
      "application/rdf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rdf", "owl"]
      },
      "application/reginfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rif"]
      },
      "application/relax-ng-compact-syntax": {
        source: "iana",
        extensions: ["rnc"]
      },
      "application/remote-printing": {
        source: "apache"
      },
      "application/reputon+json": {
        source: "iana",
        compressible: true
      },
      "application/resolve-response+jwt": {
        source: "iana"
      },
      "application/resource-lists+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rl"]
      },
      "application/resource-lists-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rld"]
      },
      "application/rfc+xml": {
        source: "iana",
        compressible: true
      },
      "application/riscos": {
        source: "iana"
      },
      "application/rlmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/rls-services+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rs"]
      },
      "application/route-apd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rapd"]
      },
      "application/route-s-tsid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sls"]
      },
      "application/route-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rusd"]
      },
      "application/rpki-checklist": {
        source: "iana"
      },
      "application/rpki-ghostbusters": {
        source: "iana",
        extensions: ["gbr"]
      },
      "application/rpki-manifest": {
        source: "iana",
        extensions: ["mft"]
      },
      "application/rpki-publication": {
        source: "iana"
      },
      "application/rpki-roa": {
        source: "iana",
        extensions: ["roa"]
      },
      "application/rpki-signed-tal": {
        source: "iana"
      },
      "application/rpki-updown": {
        source: "iana"
      },
      "application/rsd+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rsd"]
      },
      "application/rss+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rss"]
      },
      "application/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "application/rtploopback": {
        source: "iana"
      },
      "application/rtx": {
        source: "iana"
      },
      "application/samlassertion+xml": {
        source: "iana",
        compressible: true
      },
      "application/samlmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/sarif+json": {
        source: "iana",
        compressible: true
      },
      "application/sarif-external-properties+json": {
        source: "iana",
        compressible: true
      },
      "application/sbe": {
        source: "iana"
      },
      "application/sbml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sbml"]
      },
      "application/scaip+xml": {
        source: "iana",
        compressible: true
      },
      "application/scim+json": {
        source: "iana",
        compressible: true
      },
      "application/scvp-cv-request": {
        source: "iana",
        extensions: ["scq"]
      },
      "application/scvp-cv-response": {
        source: "iana",
        extensions: ["scs"]
      },
      "application/scvp-vp-request": {
        source: "iana",
        extensions: ["spq"]
      },
      "application/scvp-vp-response": {
        source: "iana",
        extensions: ["spp"]
      },
      "application/sdp": {
        source: "iana",
        extensions: ["sdp"]
      },
      "application/secevent+jwt": {
        source: "iana"
      },
      "application/senml+cbor": {
        source: "iana"
      },
      "application/senml+json": {
        source: "iana",
        compressible: true
      },
      "application/senml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["senmlx"]
      },
      "application/senml-etch+cbor": {
        source: "iana"
      },
      "application/senml-etch+json": {
        source: "iana",
        compressible: true
      },
      "application/senml-exi": {
        source: "iana"
      },
      "application/sensml+cbor": {
        source: "iana"
      },
      "application/sensml+json": {
        source: "iana",
        compressible: true
      },
      "application/sensml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sensmlx"]
      },
      "application/sensml-exi": {
        source: "iana"
      },
      "application/sep+xml": {
        source: "iana",
        compressible: true
      },
      "application/sep-exi": {
        source: "iana"
      },
      "application/session-info": {
        source: "iana"
      },
      "application/set-payment": {
        source: "iana"
      },
      "application/set-payment-initiation": {
        source: "iana",
        extensions: ["setpay"]
      },
      "application/set-registration": {
        source: "iana"
      },
      "application/set-registration-initiation": {
        source: "iana",
        extensions: ["setreg"]
      },
      "application/sgml": {
        source: "iana"
      },
      "application/sgml-open-catalog": {
        source: "iana"
      },
      "application/shf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["shf"]
      },
      "application/sieve": {
        source: "iana",
        extensions: ["siv", "sieve"]
      },
      "application/simple-filter+xml": {
        source: "iana",
        compressible: true
      },
      "application/simple-message-summary": {
        source: "iana"
      },
      "application/simplesymbolcontainer": {
        source: "iana"
      },
      "application/sipc": {
        source: "iana"
      },
      "application/slate": {
        source: "iana"
      },
      "application/smil": {
        source: "apache"
      },
      "application/smil+xml": {
        source: "iana",
        compressible: true,
        extensions: ["smi", "smil"]
      },
      "application/smpte336m": {
        source: "iana"
      },
      "application/soap+fastinfoset": {
        source: "iana"
      },
      "application/soap+xml": {
        source: "iana",
        compressible: true
      },
      "application/sparql-query": {
        source: "iana",
        extensions: ["rq"]
      },
      "application/sparql-results+xml": {
        source: "iana",
        compressible: true,
        extensions: ["srx"]
      },
      "application/spdx+json": {
        source: "iana",
        compressible: true
      },
      "application/spirits-event+xml": {
        source: "iana",
        compressible: true
      },
      "application/sql": {
        source: "iana",
        extensions: ["sql"]
      },
      "application/srgs": {
        source: "iana",
        extensions: ["gram"]
      },
      "application/srgs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["grxml"]
      },
      "application/sru+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sru"]
      },
      "application/ssdl+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ssdl"]
      },
      "application/sslkeylogfile": {
        source: "iana"
      },
      "application/ssml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ssml"]
      },
      "application/st2110-41": {
        source: "iana"
      },
      "application/stix+json": {
        source: "iana",
        compressible: true
      },
      "application/stratum": {
        source: "iana"
      },
      "application/swid+cbor": {
        source: "iana"
      },
      "application/swid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["swidtag"]
      },
      "application/tamp-apex-update": {
        source: "iana"
      },
      "application/tamp-apex-update-confirm": {
        source: "iana"
      },
      "application/tamp-community-update": {
        source: "iana"
      },
      "application/tamp-community-update-confirm": {
        source: "iana"
      },
      "application/tamp-error": {
        source: "iana"
      },
      "application/tamp-sequence-adjust": {
        source: "iana"
      },
      "application/tamp-sequence-adjust-confirm": {
        source: "iana"
      },
      "application/tamp-status-query": {
        source: "iana"
      },
      "application/tamp-status-response": {
        source: "iana"
      },
      "application/tamp-update": {
        source: "iana"
      },
      "application/tamp-update-confirm": {
        source: "iana"
      },
      "application/tar": {
        compressible: true
      },
      "application/taxii+json": {
        source: "iana",
        compressible: true
      },
      "application/td+json": {
        source: "iana",
        compressible: true
      },
      "application/tei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tei", "teicorpus"]
      },
      "application/tetra_isi": {
        source: "iana"
      },
      "application/thraud+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tfi"]
      },
      "application/timestamp-query": {
        source: "iana"
      },
      "application/timestamp-reply": {
        source: "iana"
      },
      "application/timestamped-data": {
        source: "iana",
        extensions: ["tsd"]
      },
      "application/tlsrpt+gzip": {
        source: "iana"
      },
      "application/tlsrpt+json": {
        source: "iana",
        compressible: true
      },
      "application/tm+json": {
        source: "iana",
        compressible: true
      },
      "application/tnauthlist": {
        source: "iana"
      },
      "application/toc+cbor": {
        source: "iana"
      },
      "application/token-introspection+jwt": {
        source: "iana"
      },
      "application/toml": {
        source: "iana",
        compressible: true,
        extensions: ["toml"]
      },
      "application/trickle-ice-sdpfrag": {
        source: "iana"
      },
      "application/trig": {
        source: "iana",
        extensions: ["trig"]
      },
      "application/trust-chain+json": {
        source: "iana",
        compressible: true
      },
      "application/trust-mark+jwt": {
        source: "iana"
      },
      "application/trust-mark-delegation+jwt": {
        source: "iana"
      },
      "application/ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ttml"]
      },
      "application/tve-trigger": {
        source: "iana"
      },
      "application/tzif": {
        source: "iana"
      },
      "application/tzif-leap": {
        source: "iana"
      },
      "application/ubjson": {
        compressible: false,
        extensions: ["ubj"]
      },
      "application/uccs+cbor": {
        source: "iana"
      },
      "application/ujcs+json": {
        source: "iana",
        compressible: true
      },
      "application/ulpfec": {
        source: "iana"
      },
      "application/urc-grpsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/urc-ressheet+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsheet"]
      },
      "application/urc-targetdesc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["td"]
      },
      "application/urc-uisocketdesc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vc": {
        source: "iana"
      },
      "application/vc+cose": {
        source: "iana"
      },
      "application/vc+jwt": {
        source: "iana"
      },
      "application/vcard+json": {
        source: "iana",
        compressible: true
      },
      "application/vcard+xml": {
        source: "iana",
        compressible: true
      },
      "application/vemmi": {
        source: "iana"
      },
      "application/vividence.scriptfile": {
        source: "apache"
      },
      "application/vnd.1000minds.decision-model+xml": {
        source: "iana",
        compressible: true,
        extensions: ["1km"]
      },
      "application/vnd.1ob": {
        source: "iana"
      },
      "application/vnd.3gpp-prose+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc3a+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc3ach+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc3ch+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc8+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-v2x-local-service-information": {
        source: "iana"
      },
      "application/vnd.3gpp.5gnas": {
        source: "iana"
      },
      "application/vnd.3gpp.5gsa2x": {
        source: "iana"
      },
      "application/vnd.3gpp.5gsa2x-local-service-information": {
        source: "iana"
      },
      "application/vnd.3gpp.5gsv2x": {
        source: "iana"
      },
      "application/vnd.3gpp.5gsv2x-local-service-information": {
        source: "iana"
      },
      "application/vnd.3gpp.access-transfer-events+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.bsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.crs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.current-location-discovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gmop+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gtpc": {
        source: "iana"
      },
      "application/vnd.3gpp.interworking-data": {
        source: "iana"
      },
      "application/vnd.3gpp.lpp": {
        source: "iana"
      },
      "application/vnd.3gpp.mc-signalling-ear": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-msgstore-ctrl-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-payload": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-regroup+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-signalling": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-floor-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-regroup+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-signed+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-init-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-regroup+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-transmission-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mid-call+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ngap": {
        source: "iana"
      },
      "application/vnd.3gpp.pfcp": {
        source: "iana"
      },
      "application/vnd.3gpp.pic-bw-large": {
        source: "iana",
        extensions: ["plb"]
      },
      "application/vnd.3gpp.pic-bw-small": {
        source: "iana",
        extensions: ["psb"]
      },
      "application/vnd.3gpp.pic-bw-var": {
        source: "iana",
        extensions: ["pvb"]
      },
      "application/vnd.3gpp.pinapp-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.s1ap": {
        source: "iana"
      },
      "application/vnd.3gpp.seal-group-doc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.seal-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.seal-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.seal-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.seal-network-qos-management-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.seal-ue-config-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.seal-unicast-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.seal-user-profile-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.sms": {
        source: "iana"
      },
      "application/vnd.3gpp.sms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-ext+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.state-and-event-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ussd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.v2x": {
        source: "iana"
      },
      "application/vnd.3gpp.vae-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.bcmcsinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.sms": {
        source: "iana"
      },
      "application/vnd.3gpp2.tcap": {
        source: "iana",
        extensions: ["tcap"]
      },
      "application/vnd.3lightssoftware.imagescal": {
        source: "iana"
      },
      "application/vnd.3m.post-it-notes": {
        source: "iana",
        extensions: ["pwn"]
      },
      "application/vnd.accpac.simply.aso": {
        source: "iana",
        extensions: ["aso"]
      },
      "application/vnd.accpac.simply.imp": {
        source: "iana",
        extensions: ["imp"]
      },
      "application/vnd.acm.addressxfer+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.acm.chatbot+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.acucobol": {
        source: "iana",
        extensions: ["acu"]
      },
      "application/vnd.acucorp": {
        source: "iana",
        extensions: ["atc", "acutc"]
      },
      "application/vnd.adobe.air-application-installer-package+zip": {
        source: "apache",
        compressible: false,
        extensions: ["air"]
      },
      "application/vnd.adobe.flash.movie": {
        source: "iana"
      },
      "application/vnd.adobe.formscentral.fcdt": {
        source: "iana",
        extensions: ["fcdt"]
      },
      "application/vnd.adobe.fxp": {
        source: "iana",
        extensions: ["fxp", "fxpl"]
      },
      "application/vnd.adobe.partial-upload": {
        source: "iana"
      },
      "application/vnd.adobe.xdp+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdp"]
      },
      "application/vnd.adobe.xfdf": {
        source: "apache",
        extensions: ["xfdf"]
      },
      "application/vnd.aether.imp": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata-pagedef": {
        source: "iana"
      },
      "application/vnd.afpc.cmoca-cmresource": {
        source: "iana"
      },
      "application/vnd.afpc.foca-charset": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codedfont": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codepage": {
        source: "iana"
      },
      "application/vnd.afpc.modca": {
        source: "iana"
      },
      "application/vnd.afpc.modca-cmtable": {
        source: "iana"
      },
      "application/vnd.afpc.modca-formdef": {
        source: "iana"
      },
      "application/vnd.afpc.modca-mediummap": {
        source: "iana"
      },
      "application/vnd.afpc.modca-objectcontainer": {
        source: "iana"
      },
      "application/vnd.afpc.modca-overlay": {
        source: "iana"
      },
      "application/vnd.afpc.modca-pagesegment": {
        source: "iana"
      },
      "application/vnd.age": {
        source: "iana",
        extensions: ["age"]
      },
      "application/vnd.ah-barcode": {
        source: "apache"
      },
      "application/vnd.ahead.space": {
        source: "iana",
        extensions: ["ahead"]
      },
      "application/vnd.airzip.filesecure.azf": {
        source: "iana",
        extensions: ["azf"]
      },
      "application/vnd.airzip.filesecure.azs": {
        source: "iana",
        extensions: ["azs"]
      },
      "application/vnd.amadeus+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.amazon.ebook": {
        source: "apache",
        extensions: ["azw"]
      },
      "application/vnd.amazon.mobi8-ebook": {
        source: "iana"
      },
      "application/vnd.americandynamics.acc": {
        source: "iana",
        extensions: ["acc"]
      },
      "application/vnd.amiga.ami": {
        source: "iana",
        extensions: ["ami"]
      },
      "application/vnd.amundsen.maze+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.android.ota": {
        source: "iana"
      },
      "application/vnd.android.package-archive": {
        source: "apache",
        compressible: false,
        extensions: ["apk"]
      },
      "application/vnd.anki": {
        source: "iana"
      },
      "application/vnd.anser-web-certificate-issue-initiation": {
        source: "iana",
        extensions: ["cii"]
      },
      "application/vnd.anser-web-funds-transfer-initiation": {
        source: "apache",
        extensions: ["fti"]
      },
      "application/vnd.antix.game-component": {
        source: "iana",
        extensions: ["atx"]
      },
      "application/vnd.apache.arrow.file": {
        source: "iana"
      },
      "application/vnd.apache.arrow.stream": {
        source: "iana"
      },
      "application/vnd.apache.parquet": {
        source: "iana"
      },
      "application/vnd.apache.thrift.binary": {
        source: "iana"
      },
      "application/vnd.apache.thrift.compact": {
        source: "iana"
      },
      "application/vnd.apache.thrift.json": {
        source: "iana"
      },
      "application/vnd.apexlang": {
        source: "iana"
      },
      "application/vnd.api+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.aplextor.warrp+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apothekende.reservation+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apple.installer+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpkg"]
      },
      "application/vnd.apple.keynote": {
        source: "iana",
        extensions: ["key"]
      },
      "application/vnd.apple.mpegurl": {
        source: "iana",
        extensions: ["m3u8"]
      },
      "application/vnd.apple.numbers": {
        source: "iana",
        extensions: ["numbers"]
      },
      "application/vnd.apple.pages": {
        source: "iana",
        extensions: ["pages"]
      },
      "application/vnd.apple.pkpass": {
        compressible: false,
        extensions: ["pkpass"]
      },
      "application/vnd.arastra.swi": {
        source: "apache"
      },
      "application/vnd.aristanetworks.swi": {
        source: "iana",
        extensions: ["swi"]
      },
      "application/vnd.artisan+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.artsquare": {
        source: "iana"
      },
      "application/vnd.astraea-software.iota": {
        source: "iana",
        extensions: ["iota"]
      },
      "application/vnd.audiograph": {
        source: "iana",
        extensions: ["aep"]
      },
      "application/vnd.autodesk.fbx": {
        extensions: ["fbx"]
      },
      "application/vnd.autopackage": {
        source: "iana"
      },
      "application/vnd.avalon+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.avistar+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.balsamiq.bmml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["bmml"]
      },
      "application/vnd.balsamiq.bmpr": {
        source: "iana"
      },
      "application/vnd.banana-accounting": {
        source: "iana"
      },
      "application/vnd.bbf.usp.error": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bekitzur-stech+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.belightsoft.lhzd+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.belightsoft.lhzl+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.bint.med-content": {
        source: "iana"
      },
      "application/vnd.biopax.rdf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.blink-idb-value-wrapper": {
        source: "iana"
      },
      "application/vnd.blueice.multipass": {
        source: "iana",
        extensions: ["mpm"]
      },
      "application/vnd.bluetooth.ep.oob": {
        source: "iana"
      },
      "application/vnd.bluetooth.le.oob": {
        source: "iana"
      },
      "application/vnd.bmi": {
        source: "iana",
        extensions: ["bmi"]
      },
      "application/vnd.bpf": {
        source: "iana"
      },
      "application/vnd.bpf3": {
        source: "iana"
      },
      "application/vnd.businessobjects": {
        source: "iana",
        extensions: ["rep"]
      },
      "application/vnd.byu.uapi+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bzip3": {
        source: "iana"
      },
      "application/vnd.c3voc.schedule+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cab-jscript": {
        source: "iana"
      },
      "application/vnd.canon-cpdl": {
        source: "iana"
      },
      "application/vnd.canon-lips": {
        source: "iana"
      },
      "application/vnd.capasystems-pg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cendio.thinlinc.clientconf": {
        source: "iana"
      },
      "application/vnd.century-systems.tcp_stream": {
        source: "iana"
      },
      "application/vnd.chemdraw+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdxml"]
      },
      "application/vnd.chess-pgn": {
        source: "iana"
      },
      "application/vnd.chipnuts.karaoke-mmd": {
        source: "iana",
        extensions: ["mmd"]
      },
      "application/vnd.ciedi": {
        source: "iana"
      },
      "application/vnd.cinderella": {
        source: "iana",
        extensions: ["cdy"]
      },
      "application/vnd.cirpack.isdn-ext": {
        source: "iana"
      },
      "application/vnd.citationstyles.style+xml": {
        source: "iana",
        compressible: true,
        extensions: ["csl"]
      },
      "application/vnd.claymore": {
        source: "iana",
        extensions: ["cla"]
      },
      "application/vnd.cloanto.rp9": {
        source: "iana",
        extensions: ["rp9"]
      },
      "application/vnd.clonk.c4group": {
        source: "iana",
        extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"]
      },
      "application/vnd.cluetrust.cartomobile-config": {
        source: "iana",
        extensions: ["c11amc"]
      },
      "application/vnd.cluetrust.cartomobile-config-pkg": {
        source: "iana",
        extensions: ["c11amz"]
      },
      "application/vnd.cncf.helm.chart.content.v1.tar+gzip": {
        source: "iana"
      },
      "application/vnd.cncf.helm.chart.provenance.v1.prov": {
        source: "iana"
      },
      "application/vnd.cncf.helm.config.v1+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.coffeescript": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet-template": {
        source: "iana"
      },
      "application/vnd.collection+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.doc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.next+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.comicbook+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.comicbook-rar": {
        source: "iana"
      },
      "application/vnd.commerce-battelle": {
        source: "iana"
      },
      "application/vnd.commonspace": {
        source: "iana",
        extensions: ["csp"]
      },
      "application/vnd.contact.cmsg": {
        source: "iana",
        extensions: ["cdbcmsg"]
      },
      "application/vnd.coreos.ignition+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cosmocaller": {
        source: "iana",
        extensions: ["cmc"]
      },
      "application/vnd.crick.clicker": {
        source: "iana",
        extensions: ["clkx"]
      },
      "application/vnd.crick.clicker.keyboard": {
        source: "iana",
        extensions: ["clkk"]
      },
      "application/vnd.crick.clicker.palette": {
        source: "iana",
        extensions: ["clkp"]
      },
      "application/vnd.crick.clicker.template": {
        source: "iana",
        extensions: ["clkt"]
      },
      "application/vnd.crick.clicker.wordbank": {
        source: "iana",
        extensions: ["clkw"]
      },
      "application/vnd.criticaltools.wbs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wbs"]
      },
      "application/vnd.cryptii.pipe+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.crypto-shade-file": {
        source: "iana"
      },
      "application/vnd.cryptomator.encrypted": {
        source: "iana"
      },
      "application/vnd.cryptomator.vault": {
        source: "iana"
      },
      "application/vnd.ctc-posml": {
        source: "iana",
        extensions: ["pml"]
      },
      "application/vnd.ctct.ws+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cups-pdf": {
        source: "iana"
      },
      "application/vnd.cups-postscript": {
        source: "iana"
      },
      "application/vnd.cups-ppd": {
        source: "iana",
        extensions: ["ppd"]
      },
      "application/vnd.cups-raster": {
        source: "iana"
      },
      "application/vnd.cups-raw": {
        source: "iana"
      },
      "application/vnd.curl": {
        source: "iana"
      },
      "application/vnd.curl.car": {
        source: "apache",
        extensions: ["car"]
      },
      "application/vnd.curl.pcurl": {
        source: "apache",
        extensions: ["pcurl"]
      },
      "application/vnd.cyan.dean.root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cybank": {
        source: "iana"
      },
      "application/vnd.cyclonedx+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cyclonedx+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.d2l.coursepackage1p0+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.d3m-dataset": {
        source: "iana"
      },
      "application/vnd.d3m-problem": {
        source: "iana"
      },
      "application/vnd.dart": {
        source: "iana",
        compressible: true,
        extensions: ["dart"]
      },
      "application/vnd.data-vision.rdz": {
        source: "iana",
        extensions: ["rdz"]
      },
      "application/vnd.datalog": {
        source: "iana"
      },
      "application/vnd.datapackage+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dataresource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dbf": {
        source: "iana",
        extensions: ["dbf"]
      },
      "application/vnd.dcmp+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dcmp"]
      },
      "application/vnd.debian.binary-package": {
        source: "iana"
      },
      "application/vnd.dece.data": {
        source: "iana",
        extensions: ["uvf", "uvvf", "uvd", "uvvd"]
      },
      "application/vnd.dece.ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uvt", "uvvt"]
      },
      "application/vnd.dece.unspecified": {
        source: "iana",
        extensions: ["uvx", "uvvx"]
      },
      "application/vnd.dece.zip": {
        source: "iana",
        extensions: ["uvz", "uvvz"]
      },
      "application/vnd.denovo.fcselayout-link": {
        source: "iana",
        extensions: ["fe_launch"]
      },
      "application/vnd.desmume.movie": {
        source: "iana"
      },
      "application/vnd.dir-bi.plate-dl-nosuffix": {
        source: "iana"
      },
      "application/vnd.dm.delegation+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dna": {
        source: "iana",
        extensions: ["dna"]
      },
      "application/vnd.document+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dolby.mlp": {
        source: "apache",
        extensions: ["mlp"]
      },
      "application/vnd.dolby.mobile.1": {
        source: "iana"
      },
      "application/vnd.dolby.mobile.2": {
        source: "iana"
      },
      "application/vnd.doremir.scorecloud-binary-document": {
        source: "iana"
      },
      "application/vnd.dpgraph": {
        source: "iana",
        extensions: ["dpg"]
      },
      "application/vnd.dreamfactory": {
        source: "iana",
        extensions: ["dfac"]
      },
      "application/vnd.drive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ds-keypoint": {
        source: "apache",
        extensions: ["kpxx"]
      },
      "application/vnd.dtg.local": {
        source: "iana"
      },
      "application/vnd.dtg.local.flash": {
        source: "iana"
      },
      "application/vnd.dtg.local.html": {
        source: "iana"
      },
      "application/vnd.dvb.ait": {
        source: "iana",
        extensions: ["ait"]
      },
      "application/vnd.dvb.dvbisl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.dvbj": {
        source: "iana"
      },
      "application/vnd.dvb.esgcontainer": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcdftnotifaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess2": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgpdd": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcroaming": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-base": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-enhancement": {
        source: "iana"
      },
      "application/vnd.dvb.notif-aggregate-root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-container+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-generic+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-msglist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-init+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.pfr": {
        source: "iana"
      },
      "application/vnd.dvb.service": {
        source: "iana",
        extensions: ["svc"]
      },
      "application/vnd.dxr": {
        source: "iana"
      },
      "application/vnd.dynageo": {
        source: "iana",
        extensions: ["geo"]
      },
      "application/vnd.dzr": {
        source: "iana"
      },
      "application/vnd.easykaraoke.cdgdownload": {
        source: "iana"
      },
      "application/vnd.ecdis-update": {
        source: "iana"
      },
      "application/vnd.ecip.rlp": {
        source: "iana"
      },
      "application/vnd.eclipse.ditto+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ecowin.chart": {
        source: "iana",
        extensions: ["mag"]
      },
      "application/vnd.ecowin.filerequest": {
        source: "iana"
      },
      "application/vnd.ecowin.fileupdate": {
        source: "iana"
      },
      "application/vnd.ecowin.series": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesrequest": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesupdate": {
        source: "iana"
      },
      "application/vnd.efi.img": {
        source: "iana"
      },
      "application/vnd.efi.iso": {
        source: "iana"
      },
      "application/vnd.eln+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.emclient.accessrequest+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.enliven": {
        source: "iana",
        extensions: ["nml"]
      },
      "application/vnd.enphase.envoy": {
        source: "iana"
      },
      "application/vnd.eprints.data+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.epson.esf": {
        source: "iana",
        extensions: ["esf"]
      },
      "application/vnd.epson.msf": {
        source: "iana",
        extensions: ["msf"]
      },
      "application/vnd.epson.quickanime": {
        source: "iana",
        extensions: ["qam"]
      },
      "application/vnd.epson.salt": {
        source: "iana",
        extensions: ["slt"]
      },
      "application/vnd.epson.ssf": {
        source: "iana",
        extensions: ["ssf"]
      },
      "application/vnd.ericsson.quickcall": {
        source: "iana"
      },
      "application/vnd.erofs": {
        source: "iana"
      },
      "application/vnd.espass-espass+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.eszigno3+xml": {
        source: "iana",
        compressible: true,
        extensions: ["es3", "et3"]
      },
      "application/vnd.etsi.aoc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.asic-e+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.asic-s+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.cug+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvcommand+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-bc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-cod+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-npvr+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvservice+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mcid+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mheg5": {
        source: "iana"
      },
      "application/vnd.etsi.overload-control-policy-dataset+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.pstn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.sci+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.simservs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.timestamp-token": {
        source: "iana"
      },
      "application/vnd.etsi.tsl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.tsl.der": {
        source: "iana"
      },
      "application/vnd.eu.kasparian.car+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.eudora.data": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.profile": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.settings": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.theme": {
        source: "iana"
      },
      "application/vnd.exstream-empower+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.exstream-package": {
        source: "iana"
      },
      "application/vnd.ezpix-album": {
        source: "iana",
        extensions: ["ez2"]
      },
      "application/vnd.ezpix-package": {
        source: "iana",
        extensions: ["ez3"]
      },
      "application/vnd.f-secure.mobile": {
        source: "iana"
      },
      "application/vnd.familysearch.gedcom+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.fastcopy-disk-image": {
        source: "iana"
      },
      "application/vnd.fdf": {
        source: "apache",
        extensions: ["fdf"]
      },
      "application/vnd.fdsn.mseed": {
        source: "iana",
        extensions: ["mseed"]
      },
      "application/vnd.fdsn.seed": {
        source: "iana",
        extensions: ["seed", "dataless"]
      },
      "application/vnd.fdsn.stationxml+xml": {
        source: "iana",
        charset: "XML-BASED",
        compressible: true
      },
      "application/vnd.ffsns": {
        source: "iana"
      },
      "application/vnd.ficlab.flb+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.filmit.zfc": {
        source: "iana"
      },
      "application/vnd.fints": {
        source: "iana"
      },
      "application/vnd.firemonkeys.cloudcell": {
        source: "iana"
      },
      "application/vnd.flographit": {
        source: "iana",
        extensions: ["gph"]
      },
      "application/vnd.fluxtime.clip": {
        source: "iana",
        extensions: ["ftc"]
      },
      "application/vnd.font-fontforge-sfd": {
        source: "iana"
      },
      "application/vnd.framemaker": {
        source: "iana",
        extensions: ["fm", "frame", "maker", "book"]
      },
      "application/vnd.freelog.comic": {
        source: "iana"
      },
      "application/vnd.frogans.fnc": {
        source: "apache",
        extensions: ["fnc"]
      },
      "application/vnd.frogans.ltf": {
        source: "apache",
        extensions: ["ltf"]
      },
      "application/vnd.fsc.weblaunch": {
        source: "iana",
        extensions: ["fsc"]
      },
      "application/vnd.fujifilm.fb.docuworks": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.binder": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.jfi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fujitsu.oasys": {
        source: "iana",
        extensions: ["oas"]
      },
      "application/vnd.fujitsu.oasys2": {
        source: "iana",
        extensions: ["oa2"]
      },
      "application/vnd.fujitsu.oasys3": {
        source: "iana",
        extensions: ["oa3"]
      },
      "application/vnd.fujitsu.oasysgp": {
        source: "iana",
        extensions: ["fg5"]
      },
      "application/vnd.fujitsu.oasysprs": {
        source: "iana",
        extensions: ["bh2"]
      },
      "application/vnd.fujixerox.art-ex": {
        source: "iana"
      },
      "application/vnd.fujixerox.art4": {
        source: "iana"
      },
      "application/vnd.fujixerox.ddd": {
        source: "iana",
        extensions: ["ddd"]
      },
      "application/vnd.fujixerox.docuworks": {
        source: "iana",
        extensions: ["xdw"]
      },
      "application/vnd.fujixerox.docuworks.binder": {
        source: "iana",
        extensions: ["xbd"]
      },
      "application/vnd.fujixerox.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujixerox.hbpl": {
        source: "iana"
      },
      "application/vnd.fut-misnet": {
        source: "iana"
      },
      "application/vnd.futoin+cbor": {
        source: "iana"
      },
      "application/vnd.futoin+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fuzzysheet": {
        source: "iana",
        extensions: ["fzs"]
      },
      "application/vnd.ga4gh.passport+jwt": {
        source: "iana"
      },
      "application/vnd.genomatix.tuxedo": {
        source: "iana",
        extensions: ["txd"]
      },
      "application/vnd.genozip": {
        source: "iana"
      },
      "application/vnd.gentics.grd+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gentoo.catmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gentoo.ebuild": {
        source: "iana"
      },
      "application/vnd.gentoo.eclass": {
        source: "iana"
      },
      "application/vnd.gentoo.gpkg": {
        source: "iana"
      },
      "application/vnd.gentoo.manifest": {
        source: "iana"
      },
      "application/vnd.gentoo.pkgmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gentoo.xpak": {
        source: "iana"
      },
      "application/vnd.geo+json": {
        source: "apache",
        compressible: true
      },
      "application/vnd.geocube+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.geogebra.file": {
        source: "iana",
        extensions: ["ggb"]
      },
      "application/vnd.geogebra.pinboard": {
        source: "iana"
      },
      "application/vnd.geogebra.slides": {
        source: "iana",
        extensions: ["ggs"]
      },
      "application/vnd.geogebra.tool": {
        source: "iana",
        extensions: ["ggt"]
      },
      "application/vnd.geometry-explorer": {
        source: "iana",
        extensions: ["gex", "gre"]
      },
      "application/vnd.geonext": {
        source: "iana",
        extensions: ["gxt"]
      },
      "application/vnd.geoplan": {
        source: "iana",
        extensions: ["g2w"]
      },
      "application/vnd.geospace": {
        source: "iana",
        extensions: ["g3w"]
      },
      "application/vnd.gerber": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt-response": {
        source: "iana"
      },
      "application/vnd.gmx": {
        source: "iana",
        extensions: ["gmx"]
      },
      "application/vnd.gnu.taler.exchange+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gnu.taler.merchant+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.google-apps.audio": {},
      "application/vnd.google-apps.document": {
        compressible: false,
        extensions: ["gdoc"]
      },
      "application/vnd.google-apps.drawing": {
        compressible: false,
        extensions: ["gdraw"]
      },
      "application/vnd.google-apps.drive-sdk": {
        compressible: false
      },
      "application/vnd.google-apps.file": {},
      "application/vnd.google-apps.folder": {
        compressible: false
      },
      "application/vnd.google-apps.form": {
        compressible: false,
        extensions: ["gform"]
      },
      "application/vnd.google-apps.fusiontable": {},
      "application/vnd.google-apps.jam": {
        compressible: false,
        extensions: ["gjam"]
      },
      "application/vnd.google-apps.mail-layout": {},
      "application/vnd.google-apps.map": {
        compressible: false,
        extensions: ["gmap"]
      },
      "application/vnd.google-apps.photo": {},
      "application/vnd.google-apps.presentation": {
        compressible: false,
        extensions: ["gslides"]
      },
      "application/vnd.google-apps.script": {
        compressible: false,
        extensions: ["gscript"]
      },
      "application/vnd.google-apps.shortcut": {},
      "application/vnd.google-apps.site": {
        compressible: false,
        extensions: ["gsite"]
      },
      "application/vnd.google-apps.spreadsheet": {
        compressible: false,
        extensions: ["gsheet"]
      },
      "application/vnd.google-apps.unknown": {},
      "application/vnd.google-apps.video": {},
      "application/vnd.google-earth.kml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["kml"]
      },
      "application/vnd.google-earth.kmz": {
        source: "iana",
        compressible: false,
        extensions: ["kmz"]
      },
      "application/vnd.gov.sk.e-form+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.gov.sk.e-form+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.gov.sk.xmldatacontainer+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdcf"]
      },
      "application/vnd.gpxsee.map+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.grafeq": {
        source: "iana",
        extensions: ["gqf", "gqs"]
      },
      "application/vnd.gridmp": {
        source: "iana"
      },
      "application/vnd.groove-account": {
        source: "iana",
        extensions: ["gac"]
      },
      "application/vnd.groove-help": {
        source: "iana",
        extensions: ["ghf"]
      },
      "application/vnd.groove-identity-message": {
        source: "iana",
        extensions: ["gim"]
      },
      "application/vnd.groove-injector": {
        source: "iana",
        extensions: ["grv"]
      },
      "application/vnd.groove-tool-message": {
        source: "iana",
        extensions: ["gtm"]
      },
      "application/vnd.groove-tool-template": {
        source: "iana",
        extensions: ["tpl"]
      },
      "application/vnd.groove-vcard": {
        source: "iana",
        extensions: ["vcg"]
      },
      "application/vnd.hal+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hal+xml": {
        source: "iana",
        compressible: true,
        extensions: ["hal"]
      },
      "application/vnd.handheld-entertainment+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zmm"]
      },
      "application/vnd.hbci": {
        source: "iana",
        extensions: ["hbci"]
      },
      "application/vnd.hc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hcl-bireports": {
        source: "iana"
      },
      "application/vnd.hdt": {
        source: "iana"
      },
      "application/vnd.heroku+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hhe.lesson-player": {
        source: "iana",
        extensions: ["les"]
      },
      "application/vnd.hp-hpgl": {
        source: "iana",
        extensions: ["hpgl"]
      },
      "application/vnd.hp-hpid": {
        source: "iana",
        extensions: ["hpid"]
      },
      "application/vnd.hp-hps": {
        source: "iana",
        extensions: ["hps"]
      },
      "application/vnd.hp-jlyt": {
        source: "iana",
        extensions: ["jlt"]
      },
      "application/vnd.hp-pcl": {
        source: "iana",
        extensions: ["pcl"]
      },
      "application/vnd.hp-pclxl": {
        source: "iana",
        extensions: ["pclxl"]
      },
      "application/vnd.hsl": {
        source: "iana"
      },
      "application/vnd.httphone": {
        source: "iana"
      },
      "application/vnd.hydrostatix.sof-data": {
        source: "iana",
        extensions: ["sfd-hdstx"]
      },
      "application/vnd.hyper+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyper-item+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyperdrive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hzn-3d-crossword": {
        source: "iana"
      },
      "application/vnd.ibm.afplinedata": {
        source: "apache"
      },
      "application/vnd.ibm.electronic-media": {
        source: "iana"
      },
      "application/vnd.ibm.minipay": {
        source: "iana",
        extensions: ["mpy"]
      },
      "application/vnd.ibm.modcap": {
        source: "apache",
        extensions: ["afp", "listafp", "list3820"]
      },
      "application/vnd.ibm.rights-management": {
        source: "iana",
        extensions: ["irm"]
      },
      "application/vnd.ibm.secure-container": {
        source: "iana",
        extensions: ["sc"]
      },
      "application/vnd.iccprofile": {
        source: "iana",
        extensions: ["icc", "icm"]
      },
      "application/vnd.ieee.1905": {
        source: "iana"
      },
      "application/vnd.igloader": {
        source: "iana",
        extensions: ["igl"]
      },
      "application/vnd.imagemeter.folder+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.imagemeter.image+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.immervision-ivp": {
        source: "iana",
        extensions: ["ivp"]
      },
      "application/vnd.immervision-ivu": {
        source: "iana",
        extensions: ["ivu"]
      },
      "application/vnd.ims.imsccv1p1": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p2": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p3": {
        source: "iana"
      },
      "application/vnd.ims.lis.v2.result+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy.id+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings.simple+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informedcontrol.rms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informix-visionary": {
        source: "apache"
      },
      "application/vnd.infotech.project": {
        source: "iana"
      },
      "application/vnd.infotech.project+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.innopath.wamp.notification": {
        source: "iana"
      },
      "application/vnd.insors.igm": {
        source: "iana",
        extensions: ["igm"]
      },
      "application/vnd.intercon.formnet": {
        source: "iana",
        extensions: ["xpw", "xpx"]
      },
      "application/vnd.intergeo": {
        source: "iana",
        extensions: ["i2g"]
      },
      "application/vnd.intertrust.digibox": {
        source: "iana"
      },
      "application/vnd.intertrust.nncp": {
        source: "iana"
      },
      "application/vnd.intu.qbo": {
        source: "iana",
        extensions: ["qbo"]
      },
      "application/vnd.intu.qfx": {
        source: "iana",
        extensions: ["qfx"]
      },
      "application/vnd.ipfs.ipns-record": {
        source: "iana"
      },
      "application/vnd.ipld.car": {
        source: "iana"
      },
      "application/vnd.ipld.dag-cbor": {
        source: "iana"
      },
      "application/vnd.ipld.dag-json": {
        source: "iana"
      },
      "application/vnd.ipld.raw": {
        source: "iana"
      },
      "application/vnd.iptc.g2.catalogitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.conceptitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.knowledgeitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.packageitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.planningitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ipunplugged.rcprofile": {
        source: "iana",
        extensions: ["rcprofile"]
      },
      "application/vnd.irepository.package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["irp"]
      },
      "application/vnd.is-xpr": {
        source: "iana",
        extensions: ["xpr"]
      },
      "application/vnd.isac.fcs": {
        source: "iana",
        extensions: ["fcs"]
      },
      "application/vnd.iso11783-10+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.jam": {
        source: "iana",
        extensions: ["jam"]
      },
      "application/vnd.japannet-directory-service": {
        source: "iana"
      },
      "application/vnd.japannet-jpnstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-payment-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-registration": {
        source: "iana"
      },
      "application/vnd.japannet-registration-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-setstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-verification": {
        source: "iana"
      },
      "application/vnd.japannet-verification-wakeup": {
        source: "iana"
      },
      "application/vnd.jcp.javame.midlet-rms": {
        source: "iana",
        extensions: ["rms"]
      },
      "application/vnd.jisp": {
        source: "iana",
        extensions: ["jisp"]
      },
      "application/vnd.joost.joda-archive": {
        source: "iana",
        extensions: ["joda"]
      },
      "application/vnd.jsk.isdn-ngn": {
        source: "iana"
      },
      "application/vnd.kahootz": {
        source: "iana",
        extensions: ["ktz", "ktr"]
      },
      "application/vnd.kde.karbon": {
        source: "iana",
        extensions: ["karbon"]
      },
      "application/vnd.kde.kchart": {
        source: "iana",
        extensions: ["chrt"]
      },
      "application/vnd.kde.kformula": {
        source: "iana",
        extensions: ["kfo"]
      },
      "application/vnd.kde.kivio": {
        source: "iana",
        extensions: ["flw"]
      },
      "application/vnd.kde.kontour": {
        source: "iana",
        extensions: ["kon"]
      },
      "application/vnd.kde.kpresenter": {
        source: "iana",
        extensions: ["kpr", "kpt"]
      },
      "application/vnd.kde.kspread": {
        source: "iana",
        extensions: ["ksp"]
      },
      "application/vnd.kde.kword": {
        source: "iana",
        extensions: ["kwd", "kwt"]
      },
      "application/vnd.kdl": {
        source: "iana"
      },
      "application/vnd.kenameaapp": {
        source: "iana",
        extensions: ["htke"]
      },
      "application/vnd.keyman.kmp+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.keyman.kmx": {
        source: "iana"
      },
      "application/vnd.kidspiration": {
        source: "iana",
        extensions: ["kia"]
      },
      "application/vnd.kinar": {
        source: "iana",
        extensions: ["kne", "knp"]
      },
      "application/vnd.koan": {
        source: "iana",
        extensions: ["skp", "skd", "skt", "skm"]
      },
      "application/vnd.kodak-descriptor": {
        source: "iana",
        extensions: ["sse"]
      },
      "application/vnd.las": {
        source: "iana"
      },
      "application/vnd.las.las+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.las.las+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lasxml"]
      },
      "application/vnd.laszip": {
        source: "iana"
      },
      "application/vnd.ldev.productlicensing": {
        source: "iana"
      },
      "application/vnd.leap+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.liberty-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.llamagraphics.life-balance.desktop": {
        source: "iana",
        extensions: ["lbd"]
      },
      "application/vnd.llamagraphics.life-balance.exchange+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lbe"]
      },
      "application/vnd.logipipe.circuit+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.loom": {
        source: "iana"
      },
      "application/vnd.lotus-1-2-3": {
        source: "iana",
        extensions: ["123"]
      },
      "application/vnd.lotus-approach": {
        source: "iana",
        extensions: ["apr"]
      },
      "application/vnd.lotus-freelance": {
        source: "iana",
        extensions: ["pre"]
      },
      "application/vnd.lotus-notes": {
        source: "iana",
        extensions: ["nsf"]
      },
      "application/vnd.lotus-organizer": {
        source: "iana",
        extensions: ["org"]
      },
      "application/vnd.lotus-screencam": {
        source: "iana",
        extensions: ["scm"]
      },
      "application/vnd.lotus-wordpro": {
        source: "iana",
        extensions: ["lwp"]
      },
      "application/vnd.macports.portpkg": {
        source: "iana",
        extensions: ["portpkg"]
      },
      "application/vnd.mapbox-vector-tile": {
        source: "iana",
        extensions: ["mvt"]
      },
      "application/vnd.marlin.drm.actiontoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.conftoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.license+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.mdcf": {
        source: "iana"
      },
      "application/vnd.mason+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.maxar.archive.3tz+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.maxmind.maxmind-db": {
        source: "iana"
      },
      "application/vnd.mcd": {
        source: "iana",
        extensions: ["mcd"]
      },
      "application/vnd.mdl": {
        source: "iana"
      },
      "application/vnd.mdl-mbsdf": {
        source: "iana"
      },
      "application/vnd.medcalcdata": {
        source: "iana",
        extensions: ["mc1"]
      },
      "application/vnd.mediastation.cdkey": {
        source: "iana",
        extensions: ["cdkey"]
      },
      "application/vnd.medicalholodeck.recordxr": {
        source: "iana"
      },
      "application/vnd.meridian-slingshot": {
        source: "iana"
      },
      "application/vnd.mermaid": {
        source: "iana"
      },
      "application/vnd.mfer": {
        source: "iana",
        extensions: ["mwf"]
      },
      "application/vnd.mfmp": {
        source: "iana",
        extensions: ["mfm"]
      },
      "application/vnd.micro+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.micrografx.flo": {
        source: "iana",
        extensions: ["flo"]
      },
      "application/vnd.micrografx.igx": {
        source: "iana",
        extensions: ["igx"]
      },
      "application/vnd.microsoft.portable-executable": {
        source: "iana"
      },
      "application/vnd.microsoft.windows.thumbnail-cache": {
        source: "iana"
      },
      "application/vnd.miele+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.mif": {
        source: "iana",
        extensions: ["mif"]
      },
      "application/vnd.minisoft-hp3000-save": {
        source: "iana"
      },
      "application/vnd.mitsubishi.misty-guard.trustweb": {
        source: "iana"
      },
      "application/vnd.mobius.daf": {
        source: "iana",
        extensions: ["daf"]
      },
      "application/vnd.mobius.dis": {
        source: "iana",
        extensions: ["dis"]
      },
      "application/vnd.mobius.mbk": {
        source: "iana",
        extensions: ["mbk"]
      },
      "application/vnd.mobius.mqy": {
        source: "iana",
        extensions: ["mqy"]
      },
      "application/vnd.mobius.msl": {
        source: "iana",
        extensions: ["msl"]
      },
      "application/vnd.mobius.plc": {
        source: "iana",
        extensions: ["plc"]
      },
      "application/vnd.mobius.txf": {
        source: "iana",
        extensions: ["txf"]
      },
      "application/vnd.modl": {
        source: "iana"
      },
      "application/vnd.mophun.application": {
        source: "iana",
        extensions: ["mpn"]
      },
      "application/vnd.mophun.certificate": {
        source: "iana",
        extensions: ["mpc"]
      },
      "application/vnd.motorola.flexsuite": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.adsi": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.fis": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.gotap": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.kmr": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.ttc": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.wem": {
        source: "iana"
      },
      "application/vnd.motorola.iprm": {
        source: "iana"
      },
      "application/vnd.mozilla.xul+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xul"]
      },
      "application/vnd.ms-3mfdocument": {
        source: "iana"
      },
      "application/vnd.ms-artgalry": {
        source: "iana",
        extensions: ["cil"]
      },
      "application/vnd.ms-asf": {
        source: "iana"
      },
      "application/vnd.ms-cab-compressed": {
        source: "iana",
        extensions: ["cab"]
      },
      "application/vnd.ms-color.iccprofile": {
        source: "apache"
      },
      "application/vnd.ms-excel": {
        source: "iana",
        compressible: false,
        extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"]
      },
      "application/vnd.ms-excel.addin.macroenabled.12": {
        source: "iana",
        extensions: ["xlam"]
      },
      "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
        source: "iana",
        extensions: ["xlsb"]
      },
      "application/vnd.ms-excel.sheet.macroenabled.12": {
        source: "iana",
        extensions: ["xlsm"]
      },
      "application/vnd.ms-excel.template.macroenabled.12": {
        source: "iana",
        extensions: ["xltm"]
      },
      "application/vnd.ms-fontobject": {
        source: "iana",
        compressible: true,
        extensions: ["eot"]
      },
      "application/vnd.ms-htmlhelp": {
        source: "iana",
        extensions: ["chm"]
      },
      "application/vnd.ms-ims": {
        source: "iana",
        extensions: ["ims"]
      },
      "application/vnd.ms-lrm": {
        source: "iana",
        extensions: ["lrm"]
      },
      "application/vnd.ms-office.activex+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-officetheme": {
        source: "iana",
        extensions: ["thmx"]
      },
      "application/vnd.ms-opentype": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-outlook": {
        compressible: false,
        extensions: ["msg"]
      },
      "application/vnd.ms-package.obfuscated-opentype": {
        source: "apache"
      },
      "application/vnd.ms-pki.seccat": {
        source: "apache",
        extensions: ["cat"]
      },
      "application/vnd.ms-pki.stl": {
        source: "apache",
        extensions: ["stl"]
      },
      "application/vnd.ms-playready.initiator+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-powerpoint": {
        source: "iana",
        compressible: false,
        extensions: ["ppt", "pps", "pot"]
      },
      "application/vnd.ms-powerpoint.addin.macroenabled.12": {
        source: "iana",
        extensions: ["ppam"]
      },
      "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
        source: "iana",
        extensions: ["pptm"]
      },
      "application/vnd.ms-powerpoint.slide.macroenabled.12": {
        source: "iana",
        extensions: ["sldm"]
      },
      "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
        source: "iana",
        extensions: ["ppsm"]
      },
      "application/vnd.ms-powerpoint.template.macroenabled.12": {
        source: "iana",
        extensions: ["potm"]
      },
      "application/vnd.ms-printdevicecapabilities+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-printing.printticket+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-printschematicket+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-project": {
        source: "iana",
        extensions: ["mpp", "mpt"]
      },
      "application/vnd.ms-tnef": {
        source: "iana"
      },
      "application/vnd.ms-visio.viewer": {
        extensions: ["vdx"]
      },
      "application/vnd.ms-windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.nwprinting.oob": {
        source: "iana"
      },
      "application/vnd.ms-windows.printerpairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.wsd.oob": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-resp": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-resp": {
        source: "iana"
      },
      "application/vnd.ms-word.document.macroenabled.12": {
        source: "iana",
        extensions: ["docm"]
      },
      "application/vnd.ms-word.template.macroenabled.12": {
        source: "iana",
        extensions: ["dotm"]
      },
      "application/vnd.ms-works": {
        source: "iana",
        extensions: ["wps", "wks", "wcm", "wdb"]
      },
      "application/vnd.ms-wpl": {
        source: "iana",
        extensions: ["wpl"]
      },
      "application/vnd.ms-xpsdocument": {
        source: "iana",
        compressible: false,
        extensions: ["xps"]
      },
      "application/vnd.msa-disk-image": {
        source: "iana"
      },
      "application/vnd.mseq": {
        source: "iana",
        extensions: ["mseq"]
      },
      "application/vnd.msgpack": {
        source: "iana"
      },
      "application/vnd.msign": {
        source: "iana"
      },
      "application/vnd.multiad.creator": {
        source: "iana"
      },
      "application/vnd.multiad.creator.cif": {
        source: "iana"
      },
      "application/vnd.music-niff": {
        source: "iana"
      },
      "application/vnd.musician": {
        source: "iana",
        extensions: ["mus"]
      },
      "application/vnd.muvee.style": {
        source: "iana",
        extensions: ["msty"]
      },
      "application/vnd.mynfc": {
        source: "iana",
        extensions: ["taglet"]
      },
      "application/vnd.nacamar.ybrid+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nato.bindingdataobject+cbor": {
        source: "iana"
      },
      "application/vnd.nato.bindingdataobject+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nato.bindingdataobject+xml": {
        source: "iana",
        compressible: true,
        extensions: ["bdo"]
      },
      "application/vnd.nato.openxmlformats-package.iepd+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.ncd.control": {
        source: "iana"
      },
      "application/vnd.ncd.reference": {
        source: "iana"
      },
      "application/vnd.nearst.inv+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nebumind.line": {
        source: "iana"
      },
      "application/vnd.nervana": {
        source: "iana"
      },
      "application/vnd.netfpx": {
        source: "iana"
      },
      "application/vnd.neurolanguage.nlu": {
        source: "iana",
        extensions: ["nlu"]
      },
      "application/vnd.nimn": {
        source: "iana"
      },
      "application/vnd.nintendo.nitro.rom": {
        source: "iana"
      },
      "application/vnd.nintendo.snes.rom": {
        source: "iana"
      },
      "application/vnd.nitf": {
        source: "iana",
        extensions: ["ntf", "nitf"]
      },
      "application/vnd.noblenet-directory": {
        source: "iana",
        extensions: ["nnd"]
      },
      "application/vnd.noblenet-sealer": {
        source: "iana",
        extensions: ["nns"]
      },
      "application/vnd.noblenet-web": {
        source: "iana",
        extensions: ["nnw"]
      },
      "application/vnd.nokia.catalogs": {
        source: "iana"
      },
      "application/vnd.nokia.conml+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.conml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.iptv.config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.isds-radio-presets": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.landmarkcollection+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.n-gage.ac+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ac"]
      },
      "application/vnd.nokia.n-gage.data": {
        source: "iana",
        extensions: ["ngdat"]
      },
      "application/vnd.nokia.n-gage.symbian.install": {
        source: "apache",
        extensions: ["n-gage"]
      },
      "application/vnd.nokia.ncd": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.radio-preset": {
        source: "iana",
        extensions: ["rpst"]
      },
      "application/vnd.nokia.radio-presets": {
        source: "iana",
        extensions: ["rpss"]
      },
      "application/vnd.novadigm.edm": {
        source: "iana",
        extensions: ["edm"]
      },
      "application/vnd.novadigm.edx": {
        source: "iana",
        extensions: ["edx"]
      },
      "application/vnd.novadigm.ext": {
        source: "iana",
        extensions: ["ext"]
      },
      "application/vnd.ntt-local.content-share": {
        source: "iana"
      },
      "application/vnd.ntt-local.file-transfer": {
        source: "iana"
      },
      "application/vnd.ntt-local.ogw_remote-access": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_remote": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_tcp_stream": {
        source: "iana"
      },
      "application/vnd.oai.workflows": {
        source: "iana"
      },
      "application/vnd.oai.workflows+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oai.workflows+yaml": {
        source: "iana"
      },
      "application/vnd.oasis.opendocument.base": {
        source: "iana"
      },
      "application/vnd.oasis.opendocument.chart": {
        source: "iana",
        extensions: ["odc"]
      },
      "application/vnd.oasis.opendocument.chart-template": {
        source: "iana",
        extensions: ["otc"]
      },
      "application/vnd.oasis.opendocument.database": {
        source: "apache",
        extensions: ["odb"]
      },
      "application/vnd.oasis.opendocument.formula": {
        source: "iana",
        extensions: ["odf"]
      },
      "application/vnd.oasis.opendocument.formula-template": {
        source: "iana",
        extensions: ["odft"]
      },
      "application/vnd.oasis.opendocument.graphics": {
        source: "iana",
        compressible: false,
        extensions: ["odg"]
      },
      "application/vnd.oasis.opendocument.graphics-template": {
        source: "iana",
        extensions: ["otg"]
      },
      "application/vnd.oasis.opendocument.image": {
        source: "iana",
        extensions: ["odi"]
      },
      "application/vnd.oasis.opendocument.image-template": {
        source: "iana",
        extensions: ["oti"]
      },
      "application/vnd.oasis.opendocument.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["odp"]
      },
      "application/vnd.oasis.opendocument.presentation-template": {
        source: "iana",
        extensions: ["otp"]
      },
      "application/vnd.oasis.opendocument.spreadsheet": {
        source: "iana",
        compressible: false,
        extensions: ["ods"]
      },
      "application/vnd.oasis.opendocument.spreadsheet-template": {
        source: "iana",
        extensions: ["ots"]
      },
      "application/vnd.oasis.opendocument.text": {
        source: "iana",
        compressible: false,
        extensions: ["odt"]
      },
      "application/vnd.oasis.opendocument.text-master": {
        source: "iana",
        extensions: ["odm"]
      },
      "application/vnd.oasis.opendocument.text-master-template": {
        source: "iana"
      },
      "application/vnd.oasis.opendocument.text-template": {
        source: "iana",
        extensions: ["ott"]
      },
      "application/vnd.oasis.opendocument.text-web": {
        source: "iana",
        extensions: ["oth"]
      },
      "application/vnd.obn": {
        source: "iana"
      },
      "application/vnd.ocf+cbor": {
        source: "iana"
      },
      "application/vnd.oci.image.manifest.v1+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oftn.l10n+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessdownload+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessstreaming+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.cspg-hexbinary": {
        source: "iana"
      },
      "application/vnd.oipf.dae.svg+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.dae.xhtml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.mippvcontrolmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.pae.gem": {
        source: "iana"
      },
      "application/vnd.oipf.spdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.spdlist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.ueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.userprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.olpc-sugar": {
        source: "iana",
        extensions: ["xo"]
      },
      "application/vnd.oma-scws-config": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-request": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-response": {
        source: "iana"
      },
      "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.drm-trigger+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.oma.bcast.imd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.ltkm": {
        source: "iana"
      },
      "application/vnd.oma.bcast.notification+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.provisioningtrigger": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgboot": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgdd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sgdu": {
        source: "iana"
      },
      "application/vnd.oma.bcast.simple-symbol-container": {
        source: "iana"
      },
      "application/vnd.oma.bcast.smartcard-trigger+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.oma.bcast.sprov+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.stkm": {
        source: "iana"
      },
      "application/vnd.oma.cab-address-book+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-feature-handler+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-pcc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-subs-invite+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-user-prefs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.dcd": {
        source: "iana"
      },
      "application/vnd.oma.dcdc": {
        source: "iana"
      },
      "application/vnd.oma.dd2+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dd2"]
      },
      "application/vnd.oma.drm.risd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.group-usage-list+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+cbor": {
        source: "iana"
      },
      "application/vnd.oma.lwm2m+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+tlv": {
        source: "iana"
      },
      "application/vnd.oma.pal+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.detailed-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.final-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.groups+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.invocation-descriptor+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.optimized-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.push": {
        source: "iana"
      },
      "application/vnd.oma.scidm.messages+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.xcap-directory+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.omads-email+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-file+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-folder+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omaloc-supl-init": {
        source: "iana"
      },
      "application/vnd.onepager": {
        source: "iana"
      },
      "application/vnd.onepagertamp": {
        source: "iana"
      },
      "application/vnd.onepagertamx": {
        source: "iana"
      },
      "application/vnd.onepagertat": {
        source: "iana"
      },
      "application/vnd.onepagertatp": {
        source: "iana"
      },
      "application/vnd.onepagertatx": {
        source: "iana"
      },
      "application/vnd.onvif.metadata": {
        source: "iana"
      },
      "application/vnd.openblox.game+xml": {
        source: "iana",
        compressible: true,
        extensions: ["obgx"]
      },
      "application/vnd.openblox.game-binary": {
        source: "iana"
      },
      "application/vnd.openeye.oeb": {
        source: "iana"
      },
      "application/vnd.openofficeorg.extension": {
        source: "apache",
        extensions: ["oxt"]
      },
      "application/vnd.openstreetmap.data+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osm"]
      },
      "application/vnd.opentimestamps.ots": {
        source: "iana"
      },
      "application/vnd.openvpi.dspx+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawing+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["pptx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide": {
        source: "iana",
        extensions: ["sldx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
        source: "iana",
        extensions: ["ppsx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template": {
        source: "iana",
        extensions: ["potx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        source: "iana",
        compressible: false,
        extensions: ["xlsx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
        source: "iana",
        extensions: ["xltx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.theme+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.vmldrawing": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        source: "iana",
        compressible: false,
        extensions: ["docx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
        source: "iana",
        extensions: ["dotx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.core-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.relationships+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oracle.resource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.orange.indata": {
        source: "iana"
      },
      "application/vnd.osa.netdeploy": {
        source: "iana"
      },
      "application/vnd.osgeo.mapguide.package": {
        source: "iana",
        extensions: ["mgp"]
      },
      "application/vnd.osgi.bundle": {
        source: "iana"
      },
      "application/vnd.osgi.dp": {
        source: "iana",
        extensions: ["dp"]
      },
      "application/vnd.osgi.subsystem": {
        source: "iana",
        extensions: ["esa"]
      },
      "application/vnd.otps.ct-kip+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oxli.countgraph": {
        source: "iana"
      },
      "application/vnd.pagerduty+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.palm": {
        source: "iana",
        extensions: ["pdb", "pqa", "oprc"]
      },
      "application/vnd.panoply": {
        source: "iana"
      },
      "application/vnd.paos.xml": {
        source: "iana"
      },
      "application/vnd.patentdive": {
        source: "iana"
      },
      "application/vnd.patientecommsdoc": {
        source: "iana"
      },
      "application/vnd.pawaafile": {
        source: "iana",
        extensions: ["paw"]
      },
      "application/vnd.pcos": {
        source: "iana"
      },
      "application/vnd.pg.format": {
        source: "iana",
        extensions: ["str"]
      },
      "application/vnd.pg.osasli": {
        source: "iana",
        extensions: ["ei6"]
      },
      "application/vnd.piaccess.application-licence": {
        source: "iana"
      },
      "application/vnd.picsel": {
        source: "iana",
        extensions: ["efif"]
      },
      "application/vnd.pmi.widget": {
        source: "iana",
        extensions: ["wg"]
      },
      "application/vnd.poc.group-advertisement+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.pocketlearn": {
        source: "iana",
        extensions: ["plf"]
      },
      "application/vnd.powerbuilder6": {
        source: "iana",
        extensions: ["pbd"]
      },
      "application/vnd.powerbuilder6-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder7": {
        source: "iana"
      },
      "application/vnd.powerbuilder7-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder75": {
        source: "iana"
      },
      "application/vnd.powerbuilder75-s": {
        source: "iana"
      },
      "application/vnd.preminet": {
        source: "iana"
      },
      "application/vnd.previewsystems.box": {
        source: "iana",
        extensions: ["box"]
      },
      "application/vnd.procrate.brushset": {
        extensions: ["brushset"]
      },
      "application/vnd.procreate.brush": {
        extensions: ["brush"]
      },
      "application/vnd.procreate.dream": {
        extensions: ["drm"]
      },
      "application/vnd.proteus.magazine": {
        source: "iana",
        extensions: ["mgz"]
      },
      "application/vnd.psfs": {
        source: "iana"
      },
      "application/vnd.pt.mundusmundi": {
        source: "iana"
      },
      "application/vnd.publishare-delta-tree": {
        source: "iana",
        extensions: ["qps"]
      },
      "application/vnd.pvi.ptid1": {
        source: "iana",
        extensions: ["ptid"]
      },
      "application/vnd.pwg-multiplexed": {
        source: "iana"
      },
      "application/vnd.pwg-xhtml-print+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xhtm"]
      },
      "application/vnd.qualcomm.brew-app-res": {
        source: "iana"
      },
      "application/vnd.quarantainenet": {
        source: "iana"
      },
      "application/vnd.quark.quarkxpress": {
        source: "iana",
        extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"]
      },
      "application/vnd.quobject-quoxdocument": {
        source: "iana"
      },
      "application/vnd.radisys.moml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-stream+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-base+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-detect+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-group+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-speech+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-transform+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rainstor.data": {
        source: "iana"
      },
      "application/vnd.rapid": {
        source: "iana"
      },
      "application/vnd.rar": {
        source: "iana",
        extensions: ["rar"]
      },
      "application/vnd.realvnc.bed": {
        source: "iana",
        extensions: ["bed"]
      },
      "application/vnd.recordare.musicxml": {
        source: "iana",
        extensions: ["mxl"]
      },
      "application/vnd.recordare.musicxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musicxml"]
      },
      "application/vnd.relpipe": {
        source: "iana"
      },
      "application/vnd.renlearn.rlprint": {
        source: "iana"
      },
      "application/vnd.resilient.logic": {
        source: "iana"
      },
      "application/vnd.restful+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rig.cryptonote": {
        source: "iana",
        extensions: ["cryptonote"]
      },
      "application/vnd.rim.cod": {
        source: "apache",
        extensions: ["cod"]
      },
      "application/vnd.rn-realmedia": {
        source: "apache",
        extensions: ["rm"]
      },
      "application/vnd.rn-realmedia-vbr": {
        source: "apache",
        extensions: ["rmvb"]
      },
      "application/vnd.route66.link66+xml": {
        source: "iana",
        compressible: true,
        extensions: ["link66"]
      },
      "application/vnd.rs-274x": {
        source: "iana"
      },
      "application/vnd.ruckus.download": {
        source: "iana"
      },
      "application/vnd.s3sms": {
        source: "iana"
      },
      "application/vnd.sailingtracker.track": {
        source: "iana",
        extensions: ["st"]
      },
      "application/vnd.sar": {
        source: "iana"
      },
      "application/vnd.sbm.cid": {
        source: "iana"
      },
      "application/vnd.sbm.mid2": {
        source: "iana"
      },
      "application/vnd.scribus": {
        source: "iana"
      },
      "application/vnd.sealed.3df": {
        source: "iana"
      },
      "application/vnd.sealed.csf": {
        source: "iana"
      },
      "application/vnd.sealed.doc": {
        source: "iana"
      },
      "application/vnd.sealed.eml": {
        source: "iana"
      },
      "application/vnd.sealed.mht": {
        source: "iana"
      },
      "application/vnd.sealed.net": {
        source: "iana"
      },
      "application/vnd.sealed.ppt": {
        source: "iana"
      },
      "application/vnd.sealed.tiff": {
        source: "iana"
      },
      "application/vnd.sealed.xls": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.html": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.pdf": {
        source: "iana"
      },
      "application/vnd.seemail": {
        source: "iana",
        extensions: ["see"]
      },
      "application/vnd.seis+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.sema": {
        source: "iana",
        extensions: ["sema"]
      },
      "application/vnd.semd": {
        source: "iana",
        extensions: ["semd"]
      },
      "application/vnd.semf": {
        source: "iana",
        extensions: ["semf"]
      },
      "application/vnd.shade-save-file": {
        source: "iana"
      },
      "application/vnd.shana.informed.formdata": {
        source: "iana",
        extensions: ["ifm"]
      },
      "application/vnd.shana.informed.formtemplate": {
        source: "iana",
        extensions: ["itp"]
      },
      "application/vnd.shana.informed.interchange": {
        source: "iana",
        extensions: ["iif"]
      },
      "application/vnd.shana.informed.package": {
        source: "iana",
        extensions: ["ipk"]
      },
      "application/vnd.shootproof+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shopkick+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shp": {
        source: "iana"
      },
      "application/vnd.shx": {
        source: "iana"
      },
      "application/vnd.sigrok.session": {
        source: "iana"
      },
      "application/vnd.simtech-mindmapper": {
        source: "iana",
        extensions: ["twd", "twds"]
      },
      "application/vnd.siren+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.sketchometry": {
        source: "iana"
      },
      "application/vnd.smaf": {
        source: "iana",
        extensions: ["mmf"]
      },
      "application/vnd.smart.notebook": {
        source: "iana"
      },
      "application/vnd.smart.teacher": {
        source: "iana",
        extensions: ["teacher"]
      },
      "application/vnd.smintio.portals.archive": {
        source: "iana"
      },
      "application/vnd.snesdev-page-table": {
        source: "iana"
      },
      "application/vnd.software602.filler.form+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fo"]
      },
      "application/vnd.software602.filler.form-xml-zip": {
        source: "iana"
      },
      "application/vnd.solent.sdkm+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sdkm", "sdkd"]
      },
      "application/vnd.spotfire.dxp": {
        source: "iana",
        extensions: ["dxp"]
      },
      "application/vnd.spotfire.sfs": {
        source: "iana",
        extensions: ["sfs"]
      },
      "application/vnd.sqlite3": {
        source: "iana"
      },
      "application/vnd.sss-cod": {
        source: "iana"
      },
      "application/vnd.sss-dtf": {
        source: "iana"
      },
      "application/vnd.sss-ntf": {
        source: "iana"
      },
      "application/vnd.stardivision.calc": {
        source: "apache",
        extensions: ["sdc"]
      },
      "application/vnd.stardivision.draw": {
        source: "apache",
        extensions: ["sda"]
      },
      "application/vnd.stardivision.impress": {
        source: "apache",
        extensions: ["sdd"]
      },
      "application/vnd.stardivision.math": {
        source: "apache",
        extensions: ["smf"]
      },
      "application/vnd.stardivision.writer": {
        source: "apache",
        extensions: ["sdw", "vor"]
      },
      "application/vnd.stardivision.writer-global": {
        source: "apache",
        extensions: ["sgl"]
      },
      "application/vnd.stepmania.package": {
        source: "iana",
        extensions: ["smzip"]
      },
      "application/vnd.stepmania.stepchart": {
        source: "iana",
        extensions: ["sm"]
      },
      "application/vnd.street-stream": {
        source: "iana"
      },
      "application/vnd.sun.wadl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wadl"]
      },
      "application/vnd.sun.xml.calc": {
        source: "apache",
        extensions: ["sxc"]
      },
      "application/vnd.sun.xml.calc.template": {
        source: "apache",
        extensions: ["stc"]
      },
      "application/vnd.sun.xml.draw": {
        source: "apache",
        extensions: ["sxd"]
      },
      "application/vnd.sun.xml.draw.template": {
        source: "apache",
        extensions: ["std"]
      },
      "application/vnd.sun.xml.impress": {
        source: "apache",
        extensions: ["sxi"]
      },
      "application/vnd.sun.xml.impress.template": {
        source: "apache",
        extensions: ["sti"]
      },
      "application/vnd.sun.xml.math": {
        source: "apache",
        extensions: ["sxm"]
      },
      "application/vnd.sun.xml.writer": {
        source: "apache",
        extensions: ["sxw"]
      },
      "application/vnd.sun.xml.writer.global": {
        source: "apache",
        extensions: ["sxg"]
      },
      "application/vnd.sun.xml.writer.template": {
        source: "apache",
        extensions: ["stw"]
      },
      "application/vnd.sus-calendar": {
        source: "iana",
        extensions: ["sus", "susp"]
      },
      "application/vnd.svd": {
        source: "iana",
        extensions: ["svd"]
      },
      "application/vnd.swiftview-ics": {
        source: "iana"
      },
      "application/vnd.sybyl.mol2": {
        source: "iana"
      },
      "application/vnd.sycle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.syft+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.symbian.install": {
        source: "apache",
        extensions: ["sis", "sisx"]
      },
      "application/vnd.syncml+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xsm"]
      },
      "application/vnd.syncml.dm+wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["bdm"]
      },
      "application/vnd.syncml.dm+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xdm"]
      },
      "application/vnd.syncml.dm.notification": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["ddf"]
      },
      "application/vnd.syncml.dmtnds+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmtnds+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.syncml.ds.notification": {
        source: "iana"
      },
      "application/vnd.tableschema+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tao.intent-module-archive": {
        source: "iana",
        extensions: ["tao"]
      },
      "application/vnd.tcpdump.pcap": {
        source: "iana",
        extensions: ["pcap", "cap", "dmp"]
      },
      "application/vnd.think-cell.ppttc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tmd.mediaflex.api+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tml": {
        source: "iana"
      },
      "application/vnd.tmobile-livetv": {
        source: "iana",
        extensions: ["tmo"]
      },
      "application/vnd.tri.onesource": {
        source: "iana"
      },
      "application/vnd.trid.tpt": {
        source: "iana",
        extensions: ["tpt"]
      },
      "application/vnd.triscape.mxs": {
        source: "iana",
        extensions: ["mxs"]
      },
      "application/vnd.trueapp": {
        source: "iana",
        extensions: ["tra"]
      },
      "application/vnd.truedoc": {
        source: "iana"
      },
      "application/vnd.ubisoft.webplayer": {
        source: "iana"
      },
      "application/vnd.ufdl": {
        source: "iana",
        extensions: ["ufd", "ufdl"]
      },
      "application/vnd.uic.osdm+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.uiq.theme": {
        source: "iana",
        extensions: ["utz"]
      },
      "application/vnd.umajin": {
        source: "iana",
        extensions: ["umj"]
      },
      "application/vnd.unity": {
        source: "iana",
        extensions: ["unityweb"]
      },
      "application/vnd.uoml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uoml", "uo"]
      },
      "application/vnd.uplanet.alert": {
        source: "iana"
      },
      "application/vnd.uplanet.alert-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.channel": {
        source: "iana"
      },
      "application/vnd.uplanet.channel-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.list": {
        source: "iana"
      },
      "application/vnd.uplanet.list-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.signal": {
        source: "iana"
      },
      "application/vnd.uri-map": {
        source: "iana"
      },
      "application/vnd.valve.source.material": {
        source: "iana"
      },
      "application/vnd.vcx": {
        source: "iana",
        extensions: ["vcx"]
      },
      "application/vnd.vd-study": {
        source: "iana"
      },
      "application/vnd.vectorworks": {
        source: "iana"
      },
      "application/vnd.vel+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.veraison.tsm-report+cbor": {
        source: "iana"
      },
      "application/vnd.veraison.tsm-report+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.verimatrix.vcas": {
        source: "iana"
      },
      "application/vnd.veritone.aion+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.veryant.thin": {
        source: "iana"
      },
      "application/vnd.ves.encrypted": {
        source: "iana"
      },
      "application/vnd.vidsoft.vidconference": {
        source: "iana"
      },
      "application/vnd.visio": {
        source: "iana",
        extensions: ["vsd", "vst", "vss", "vsw", "vsdx", "vtx"]
      },
      "application/vnd.visionary": {
        source: "iana",
        extensions: ["vis"]
      },
      "application/vnd.vividence.scriptfile": {
        source: "iana"
      },
      "application/vnd.vocalshaper.vsp4": {
        source: "iana"
      },
      "application/vnd.vsf": {
        source: "iana",
        extensions: ["vsf"]
      },
      "application/vnd.wap.sic": {
        source: "iana"
      },
      "application/vnd.wap.slc": {
        source: "iana"
      },
      "application/vnd.wap.wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["wbxml"]
      },
      "application/vnd.wap.wmlc": {
        source: "iana",
        extensions: ["wmlc"]
      },
      "application/vnd.wap.wmlscriptc": {
        source: "iana",
        extensions: ["wmlsc"]
      },
      "application/vnd.wasmflow.wafl": {
        source: "iana"
      },
      "application/vnd.webturbo": {
        source: "iana",
        extensions: ["wtb"]
      },
      "application/vnd.wfa.dpp": {
        source: "iana"
      },
      "application/vnd.wfa.p2p": {
        source: "iana"
      },
      "application/vnd.wfa.wsc": {
        source: "iana"
      },
      "application/vnd.windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.wmc": {
        source: "iana"
      },
      "application/vnd.wmf.bootstrap": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica.package": {
        source: "iana"
      },
      "application/vnd.wolfram.player": {
        source: "iana",
        extensions: ["nbp"]
      },
      "application/vnd.wordlift": {
        source: "iana"
      },
      "application/vnd.wordperfect": {
        source: "iana",
        extensions: ["wpd"]
      },
      "application/vnd.wqd": {
        source: "iana",
        extensions: ["wqd"]
      },
      "application/vnd.wrq-hp3000-labelled": {
        source: "iana"
      },
      "application/vnd.wt.stf": {
        source: "iana",
        extensions: ["stf"]
      },
      "application/vnd.wv.csp+wbxml": {
        source: "iana"
      },
      "application/vnd.wv.csp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.wv.ssp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xacml+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xara": {
        source: "iana",
        extensions: ["xar"]
      },
      "application/vnd.xarin.cpj": {
        source: "iana"
      },
      "application/vnd.xecrets-encrypted": {
        source: "iana"
      },
      "application/vnd.xfdl": {
        source: "iana",
        extensions: ["xfdl"]
      },
      "application/vnd.xfdl.webform": {
        source: "iana"
      },
      "application/vnd.xmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xmpie.cpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.dpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.plan": {
        source: "iana"
      },
      "application/vnd.xmpie.ppkg": {
        source: "iana"
      },
      "application/vnd.xmpie.xlim": {
        source: "iana"
      },
      "application/vnd.yamaha.hv-dic": {
        source: "iana",
        extensions: ["hvd"]
      },
      "application/vnd.yamaha.hv-script": {
        source: "iana",
        extensions: ["hvs"]
      },
      "application/vnd.yamaha.hv-voice": {
        source: "iana",
        extensions: ["hvp"]
      },
      "application/vnd.yamaha.openscoreformat": {
        source: "iana",
        extensions: ["osf"]
      },
      "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osfpvg"]
      },
      "application/vnd.yamaha.remote-setup": {
        source: "iana"
      },
      "application/vnd.yamaha.smaf-audio": {
        source: "iana",
        extensions: ["saf"]
      },
      "application/vnd.yamaha.smaf-phrase": {
        source: "iana",
        extensions: ["spf"]
      },
      "application/vnd.yamaha.through-ngn": {
        source: "iana"
      },
      "application/vnd.yamaha.tunnel-udpencap": {
        source: "iana"
      },
      "application/vnd.yaoweme": {
        source: "iana"
      },
      "application/vnd.yellowriver-custom-menu": {
        source: "iana",
        extensions: ["cmp"]
      },
      "application/vnd.zul": {
        source: "iana",
        extensions: ["zir", "zirz"]
      },
      "application/vnd.zzazz.deck+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zaz"]
      },
      "application/voicexml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["vxml"]
      },
      "application/voucher-cms+json": {
        source: "iana",
        compressible: true
      },
      "application/voucher-jws+json": {
        source: "iana",
        compressible: true
      },
      "application/vp": {
        source: "iana"
      },
      "application/vp+cose": {
        source: "iana"
      },
      "application/vp+jwt": {
        source: "iana"
      },
      "application/vq-rtcpxr": {
        source: "iana"
      },
      "application/wasm": {
        source: "iana",
        compressible: true,
        extensions: ["wasm"]
      },
      "application/watcherinfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wif"]
      },
      "application/webpush-options+json": {
        source: "iana",
        compressible: true
      },
      "application/whoispp-query": {
        source: "iana"
      },
      "application/whoispp-response": {
        source: "iana"
      },
      "application/widget": {
        source: "iana",
        extensions: ["wgt"]
      },
      "application/winhlp": {
        source: "apache",
        extensions: ["hlp"]
      },
      "application/wita": {
        source: "iana"
      },
      "application/wordperfect5.1": {
        source: "iana"
      },
      "application/wsdl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wsdl"]
      },
      "application/wspolicy+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wspolicy"]
      },
      "application/x-7z-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["7z"]
      },
      "application/x-abiword": {
        source: "apache",
        extensions: ["abw"]
      },
      "application/x-ace-compressed": {
        source: "apache",
        extensions: ["ace"]
      },
      "application/x-amf": {
        source: "apache"
      },
      "application/x-apple-diskimage": {
        source: "apache",
        extensions: ["dmg"]
      },
      "application/x-arj": {
        compressible: false,
        extensions: ["arj"]
      },
      "application/x-authorware-bin": {
        source: "apache",
        extensions: ["aab", "x32", "u32", "vox"]
      },
      "application/x-authorware-map": {
        source: "apache",
        extensions: ["aam"]
      },
      "application/x-authorware-seg": {
        source: "apache",
        extensions: ["aas"]
      },
      "application/x-bcpio": {
        source: "apache",
        extensions: ["bcpio"]
      },
      "application/x-bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/x-bittorrent": {
        source: "apache",
        extensions: ["torrent"]
      },
      "application/x-blender": {
        extensions: ["blend"]
      },
      "application/x-blorb": {
        source: "apache",
        extensions: ["blb", "blorb"]
      },
      "application/x-bzip": {
        source: "apache",
        compressible: false,
        extensions: ["bz"]
      },
      "application/x-bzip2": {
        source: "apache",
        compressible: false,
        extensions: ["bz2", "boz"]
      },
      "application/x-cbr": {
        source: "apache",
        extensions: ["cbr", "cba", "cbt", "cbz", "cb7"]
      },
      "application/x-cdlink": {
        source: "apache",
        extensions: ["vcd"]
      },
      "application/x-cfs-compressed": {
        source: "apache",
        extensions: ["cfs"]
      },
      "application/x-chat": {
        source: "apache",
        extensions: ["chat"]
      },
      "application/x-chess-pgn": {
        source: "apache",
        extensions: ["pgn"]
      },
      "application/x-chrome-extension": {
        extensions: ["crx"]
      },
      "application/x-cocoa": {
        source: "nginx",
        extensions: ["cco"]
      },
      "application/x-compress": {
        source: "apache"
      },
      "application/x-compressed": {
        extensions: ["rar"]
      },
      "application/x-conference": {
        source: "apache",
        extensions: ["nsc"]
      },
      "application/x-cpio": {
        source: "apache",
        extensions: ["cpio"]
      },
      "application/x-csh": {
        source: "apache",
        extensions: ["csh"]
      },
      "application/x-deb": {
        compressible: false
      },
      "application/x-debian-package": {
        source: "apache",
        extensions: ["deb", "udeb"]
      },
      "application/x-dgc-compressed": {
        source: "apache",
        extensions: ["dgc"]
      },
      "application/x-director": {
        source: "apache",
        extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"]
      },
      "application/x-doom": {
        source: "apache",
        extensions: ["wad"]
      },
      "application/x-dtbncx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ncx"]
      },
      "application/x-dtbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dtb"]
      },
      "application/x-dtbresource+xml": {
        source: "apache",
        compressible: true,
        extensions: ["res"]
      },
      "application/x-dvi": {
        source: "apache",
        compressible: false,
        extensions: ["dvi"]
      },
      "application/x-envoy": {
        source: "apache",
        extensions: ["evy"]
      },
      "application/x-eva": {
        source: "apache",
        extensions: ["eva"]
      },
      "application/x-font-bdf": {
        source: "apache",
        extensions: ["bdf"]
      },
      "application/x-font-dos": {
        source: "apache"
      },
      "application/x-font-framemaker": {
        source: "apache"
      },
      "application/x-font-ghostscript": {
        source: "apache",
        extensions: ["gsf"]
      },
      "application/x-font-libgrx": {
        source: "apache"
      },
      "application/x-font-linux-psf": {
        source: "apache",
        extensions: ["psf"]
      },
      "application/x-font-pcf": {
        source: "apache",
        extensions: ["pcf"]
      },
      "application/x-font-snf": {
        source: "apache",
        extensions: ["snf"]
      },
      "application/x-font-speedo": {
        source: "apache"
      },
      "application/x-font-sunos-news": {
        source: "apache"
      },
      "application/x-font-type1": {
        source: "apache",
        extensions: ["pfa", "pfb", "pfm", "afm"]
      },
      "application/x-font-vfont": {
        source: "apache"
      },
      "application/x-freearc": {
        source: "apache",
        extensions: ["arc"]
      },
      "application/x-futuresplash": {
        source: "apache",
        extensions: ["spl"]
      },
      "application/x-gca-compressed": {
        source: "apache",
        extensions: ["gca"]
      },
      "application/x-glulx": {
        source: "apache",
        extensions: ["ulx"]
      },
      "application/x-gnumeric": {
        source: "apache",
        extensions: ["gnumeric"]
      },
      "application/x-gramps-xml": {
        source: "apache",
        extensions: ["gramps"]
      },
      "application/x-gtar": {
        source: "apache",
        extensions: ["gtar"]
      },
      "application/x-gzip": {
        source: "apache"
      },
      "application/x-hdf": {
        source: "apache",
        extensions: ["hdf"]
      },
      "application/x-httpd-php": {
        compressible: true,
        extensions: ["php"]
      },
      "application/x-install-instructions": {
        source: "apache",
        extensions: ["install"]
      },
      "application/x-ipynb+json": {
        compressible: true,
        extensions: ["ipynb"]
      },
      "application/x-iso9660-image": {
        source: "apache",
        extensions: ["iso"]
      },
      "application/x-iwork-keynote-sffkey": {
        extensions: ["key"]
      },
      "application/x-iwork-numbers-sffnumbers": {
        extensions: ["numbers"]
      },
      "application/x-iwork-pages-sffpages": {
        extensions: ["pages"]
      },
      "application/x-java-archive-diff": {
        source: "nginx",
        extensions: ["jardiff"]
      },
      "application/x-java-jnlp-file": {
        source: "apache",
        compressible: false,
        extensions: ["jnlp"]
      },
      "application/x-javascript": {
        compressible: true
      },
      "application/x-keepass2": {
        extensions: ["kdbx"]
      },
      "application/x-latex": {
        source: "apache",
        compressible: false,
        extensions: ["latex"]
      },
      "application/x-lua-bytecode": {
        extensions: ["luac"]
      },
      "application/x-lzh-compressed": {
        source: "apache",
        extensions: ["lzh", "lha"]
      },
      "application/x-makeself": {
        source: "nginx",
        extensions: ["run"]
      },
      "application/x-mie": {
        source: "apache",
        extensions: ["mie"]
      },
      "application/x-mobipocket-ebook": {
        source: "apache",
        extensions: ["prc", "mobi"]
      },
      "application/x-mpegurl": {
        compressible: false
      },
      "application/x-ms-application": {
        source: "apache",
        extensions: ["application"]
      },
      "application/x-ms-shortcut": {
        source: "apache",
        extensions: ["lnk"]
      },
      "application/x-ms-wmd": {
        source: "apache",
        extensions: ["wmd"]
      },
      "application/x-ms-wmz": {
        source: "apache",
        extensions: ["wmz"]
      },
      "application/x-ms-xbap": {
        source: "apache",
        extensions: ["xbap"]
      },
      "application/x-msaccess": {
        source: "apache",
        extensions: ["mdb"]
      },
      "application/x-msbinder": {
        source: "apache",
        extensions: ["obd"]
      },
      "application/x-mscardfile": {
        source: "apache",
        extensions: ["crd"]
      },
      "application/x-msclip": {
        source: "apache",
        extensions: ["clp"]
      },
      "application/x-msdos-program": {
        extensions: ["exe"]
      },
      "application/x-msdownload": {
        source: "apache",
        extensions: ["exe", "dll", "com", "bat", "msi"]
      },
      "application/x-msmediaview": {
        source: "apache",
        extensions: ["mvb", "m13", "m14"]
      },
      "application/x-msmetafile": {
        source: "apache",
        extensions: ["wmf", "wmz", "emf", "emz"]
      },
      "application/x-msmoney": {
        source: "apache",
        extensions: ["mny"]
      },
      "application/x-mspublisher": {
        source: "apache",
        extensions: ["pub"]
      },
      "application/x-msschedule": {
        source: "apache",
        extensions: ["scd"]
      },
      "application/x-msterminal": {
        source: "apache",
        extensions: ["trm"]
      },
      "application/x-mswrite": {
        source: "apache",
        extensions: ["wri"]
      },
      "application/x-netcdf": {
        source: "apache",
        extensions: ["nc", "cdf"]
      },
      "application/x-ns-proxy-autoconfig": {
        compressible: true,
        extensions: ["pac"]
      },
      "application/x-nzb": {
        source: "apache",
        extensions: ["nzb"]
      },
      "application/x-perl": {
        source: "nginx",
        extensions: ["pl", "pm"]
      },
      "application/x-pilot": {
        source: "nginx",
        extensions: ["prc", "pdb"]
      },
      "application/x-pkcs12": {
        source: "apache",
        compressible: false,
        extensions: ["p12", "pfx"]
      },
      "application/x-pkcs7-certificates": {
        source: "apache",
        extensions: ["p7b", "spc"]
      },
      "application/x-pkcs7-certreqresp": {
        source: "apache",
        extensions: ["p7r"]
      },
      "application/x-pki-message": {
        source: "iana"
      },
      "application/x-rar-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["rar"]
      },
      "application/x-redhat-package-manager": {
        source: "nginx",
        extensions: ["rpm"]
      },
      "application/x-research-info-systems": {
        source: "apache",
        extensions: ["ris"]
      },
      "application/x-sea": {
        source: "nginx",
        extensions: ["sea"]
      },
      "application/x-sh": {
        source: "apache",
        compressible: true,
        extensions: ["sh"]
      },
      "application/x-shar": {
        source: "apache",
        extensions: ["shar"]
      },
      "application/x-shockwave-flash": {
        source: "apache",
        compressible: false,
        extensions: ["swf"]
      },
      "application/x-silverlight-app": {
        source: "apache",
        extensions: ["xap"]
      },
      "application/x-sql": {
        source: "apache",
        extensions: ["sql"]
      },
      "application/x-stuffit": {
        source: "apache",
        compressible: false,
        extensions: ["sit"]
      },
      "application/x-stuffitx": {
        source: "apache",
        extensions: ["sitx"]
      },
      "application/x-subrip": {
        source: "apache",
        extensions: ["srt"]
      },
      "application/x-sv4cpio": {
        source: "apache",
        extensions: ["sv4cpio"]
      },
      "application/x-sv4crc": {
        source: "apache",
        extensions: ["sv4crc"]
      },
      "application/x-t3vm-image": {
        source: "apache",
        extensions: ["t3"]
      },
      "application/x-tads": {
        source: "apache",
        extensions: ["gam"]
      },
      "application/x-tar": {
        source: "apache",
        compressible: true,
        extensions: ["tar"]
      },
      "application/x-tcl": {
        source: "apache",
        extensions: ["tcl", "tk"]
      },
      "application/x-tex": {
        source: "apache",
        extensions: ["tex"]
      },
      "application/x-tex-tfm": {
        source: "apache",
        extensions: ["tfm"]
      },
      "application/x-texinfo": {
        source: "apache",
        extensions: ["texinfo", "texi"]
      },
      "application/x-tgif": {
        source: "apache",
        extensions: ["obj"]
      },
      "application/x-ustar": {
        source: "apache",
        extensions: ["ustar"]
      },
      "application/x-virtualbox-hdd": {
        compressible: true,
        extensions: ["hdd"]
      },
      "application/x-virtualbox-ova": {
        compressible: true,
        extensions: ["ova"]
      },
      "application/x-virtualbox-ovf": {
        compressible: true,
        extensions: ["ovf"]
      },
      "application/x-virtualbox-vbox": {
        compressible: true,
        extensions: ["vbox"]
      },
      "application/x-virtualbox-vbox-extpack": {
        compressible: false,
        extensions: ["vbox-extpack"]
      },
      "application/x-virtualbox-vdi": {
        compressible: true,
        extensions: ["vdi"]
      },
      "application/x-virtualbox-vhd": {
        compressible: true,
        extensions: ["vhd"]
      },
      "application/x-virtualbox-vmdk": {
        compressible: true,
        extensions: ["vmdk"]
      },
      "application/x-wais-source": {
        source: "apache",
        extensions: ["src"]
      },
      "application/x-web-app-manifest+json": {
        compressible: true,
        extensions: ["webapp"]
      },
      "application/x-www-form-urlencoded": {
        source: "iana",
        compressible: true
      },
      "application/x-x509-ca-cert": {
        source: "iana",
        extensions: ["der", "crt", "pem"]
      },
      "application/x-x509-ca-ra-cert": {
        source: "iana"
      },
      "application/x-x509-next-ca-cert": {
        source: "iana"
      },
      "application/x-xfig": {
        source: "apache",
        extensions: ["fig"]
      },
      "application/x-xliff+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/x-xpinstall": {
        source: "apache",
        compressible: false,
        extensions: ["xpi"]
      },
      "application/x-xz": {
        source: "apache",
        extensions: ["xz"]
      },
      "application/x-zip-compressed": {
        extensions: ["zip"]
      },
      "application/x-zmachine": {
        source: "apache",
        extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"]
      },
      "application/x400-bp": {
        source: "iana"
      },
      "application/xacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/xaml+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xaml"]
      },
      "application/xcap-att+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xav"]
      },
      "application/xcap-caps+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xca"]
      },
      "application/xcap-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdf"]
      },
      "application/xcap-el+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xel"]
      },
      "application/xcap-error+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcap-ns+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xns"]
      },
      "application/xcon-conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcon-conference-info-diff+xml": {
        source: "iana",
        compressible: true
      },
      "application/xenc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xenc"]
      },
      "application/xfdf": {
        source: "iana",
        extensions: ["xfdf"]
      },
      "application/xhtml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xhtml", "xht"]
      },
      "application/xhtml-voice+xml": {
        source: "apache",
        compressible: true
      },
      "application/xliff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml", "xsl", "xsd", "rng"]
      },
      "application/xml-dtd": {
        source: "iana",
        compressible: true,
        extensions: ["dtd"]
      },
      "application/xml-external-parsed-entity": {
        source: "iana"
      },
      "application/xml-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/xmpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/xop+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xop"]
      },
      "application/xproc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xpl"]
      },
      "application/xslt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xsl", "xslt"]
      },
      "application/xspf+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xspf"]
      },
      "application/xv+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mxml", "xhvml", "xvml", "xvm"]
      },
      "application/yaml": {
        source: "iana"
      },
      "application/yang": {
        source: "iana",
        extensions: ["yang"]
      },
      "application/yang-data+cbor": {
        source: "iana"
      },
      "application/yang-data+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-data+xml": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/yang-sid+json": {
        source: "iana",
        compressible: true
      },
      "application/yin+xml": {
        source: "iana",
        compressible: true,
        extensions: ["yin"]
      },
      "application/zip": {
        source: "iana",
        compressible: false,
        extensions: ["zip"]
      },
      "application/zip+dotlottie": {
        extensions: ["lottie"]
      },
      "application/zlib": {
        source: "iana"
      },
      "application/zstd": {
        source: "iana"
      },
      "audio/1d-interleaved-parityfec": {
        source: "iana"
      },
      "audio/32kadpcm": {
        source: "iana"
      },
      "audio/3gpp": {
        source: "iana",
        compressible: false,
        extensions: ["3gpp"]
      },
      "audio/3gpp2": {
        source: "iana"
      },
      "audio/aac": {
        source: "iana",
        extensions: ["adts", "aac"]
      },
      "audio/ac3": {
        source: "iana"
      },
      "audio/adpcm": {
        source: "apache",
        extensions: ["adp"]
      },
      "audio/amr": {
        source: "iana",
        extensions: ["amr"]
      },
      "audio/amr-wb": {
        source: "iana"
      },
      "audio/amr-wb+": {
        source: "iana"
      },
      "audio/aptx": {
        source: "iana"
      },
      "audio/asc": {
        source: "iana"
      },
      "audio/atrac-advanced-lossless": {
        source: "iana"
      },
      "audio/atrac-x": {
        source: "iana"
      },
      "audio/atrac3": {
        source: "iana"
      },
      "audio/basic": {
        source: "iana",
        compressible: false,
        extensions: ["au", "snd"]
      },
      "audio/bv16": {
        source: "iana"
      },
      "audio/bv32": {
        source: "iana"
      },
      "audio/clearmode": {
        source: "iana"
      },
      "audio/cn": {
        source: "iana"
      },
      "audio/dat12": {
        source: "iana"
      },
      "audio/dls": {
        source: "iana"
      },
      "audio/dsr-es201108": {
        source: "iana"
      },
      "audio/dsr-es202050": {
        source: "iana"
      },
      "audio/dsr-es202211": {
        source: "iana"
      },
      "audio/dsr-es202212": {
        source: "iana"
      },
      "audio/dv": {
        source: "iana"
      },
      "audio/dvi4": {
        source: "iana"
      },
      "audio/eac3": {
        source: "iana"
      },
      "audio/encaprtp": {
        source: "iana"
      },
      "audio/evrc": {
        source: "iana"
      },
      "audio/evrc-qcp": {
        source: "iana"
      },
      "audio/evrc0": {
        source: "iana"
      },
      "audio/evrc1": {
        source: "iana"
      },
      "audio/evrcb": {
        source: "iana"
      },
      "audio/evrcb0": {
        source: "iana"
      },
      "audio/evrcb1": {
        source: "iana"
      },
      "audio/evrcnw": {
        source: "iana"
      },
      "audio/evrcnw0": {
        source: "iana"
      },
      "audio/evrcnw1": {
        source: "iana"
      },
      "audio/evrcwb": {
        source: "iana"
      },
      "audio/evrcwb0": {
        source: "iana"
      },
      "audio/evrcwb1": {
        source: "iana"
      },
      "audio/evs": {
        source: "iana"
      },
      "audio/flac": {
        source: "iana"
      },
      "audio/flexfec": {
        source: "iana"
      },
      "audio/fwdred": {
        source: "iana"
      },
      "audio/g711-0": {
        source: "iana"
      },
      "audio/g719": {
        source: "iana"
      },
      "audio/g722": {
        source: "iana"
      },
      "audio/g7221": {
        source: "iana"
      },
      "audio/g723": {
        source: "iana"
      },
      "audio/g726-16": {
        source: "iana"
      },
      "audio/g726-24": {
        source: "iana"
      },
      "audio/g726-32": {
        source: "iana"
      },
      "audio/g726-40": {
        source: "iana"
      },
      "audio/g728": {
        source: "iana"
      },
      "audio/g729": {
        source: "iana"
      },
      "audio/g7291": {
        source: "iana"
      },
      "audio/g729d": {
        source: "iana"
      },
      "audio/g729e": {
        source: "iana"
      },
      "audio/gsm": {
        source: "iana"
      },
      "audio/gsm-efr": {
        source: "iana"
      },
      "audio/gsm-hr-08": {
        source: "iana"
      },
      "audio/ilbc": {
        source: "iana"
      },
      "audio/ip-mr_v2.5": {
        source: "iana"
      },
      "audio/isac": {
        source: "apache"
      },
      "audio/l16": {
        source: "iana"
      },
      "audio/l20": {
        source: "iana"
      },
      "audio/l24": {
        source: "iana",
        compressible: false
      },
      "audio/l8": {
        source: "iana"
      },
      "audio/lpc": {
        source: "iana"
      },
      "audio/matroska": {
        source: "iana"
      },
      "audio/melp": {
        source: "iana"
      },
      "audio/melp1200": {
        source: "iana"
      },
      "audio/melp2400": {
        source: "iana"
      },
      "audio/melp600": {
        source: "iana"
      },
      "audio/mhas": {
        source: "iana"
      },
      "audio/midi": {
        source: "apache",
        extensions: ["mid", "midi", "kar", "rmi"]
      },
      "audio/midi-clip": {
        source: "iana"
      },
      "audio/mobile-xmf": {
        source: "iana",
        extensions: ["mxmf"]
      },
      "audio/mp3": {
        compressible: false,
        extensions: ["mp3"]
      },
      "audio/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["m4a", "mp4a", "m4b"]
      },
      "audio/mp4a-latm": {
        source: "iana"
      },
      "audio/mpa": {
        source: "iana"
      },
      "audio/mpa-robust": {
        source: "iana"
      },
      "audio/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
      },
      "audio/mpeg4-generic": {
        source: "iana"
      },
      "audio/musepack": {
        source: "apache"
      },
      "audio/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["oga", "ogg", "spx", "opus"]
      },
      "audio/opus": {
        source: "iana"
      },
      "audio/parityfec": {
        source: "iana"
      },
      "audio/pcma": {
        source: "iana"
      },
      "audio/pcma-wb": {
        source: "iana"
      },
      "audio/pcmu": {
        source: "iana"
      },
      "audio/pcmu-wb": {
        source: "iana"
      },
      "audio/prs.sid": {
        source: "iana"
      },
      "audio/qcelp": {
        source: "iana"
      },
      "audio/raptorfec": {
        source: "iana"
      },
      "audio/red": {
        source: "iana"
      },
      "audio/rtp-enc-aescm128": {
        source: "iana"
      },
      "audio/rtp-midi": {
        source: "iana"
      },
      "audio/rtploopback": {
        source: "iana"
      },
      "audio/rtx": {
        source: "iana"
      },
      "audio/s3m": {
        source: "apache",
        extensions: ["s3m"]
      },
      "audio/scip": {
        source: "iana"
      },
      "audio/silk": {
        source: "apache",
        extensions: ["sil"]
      },
      "audio/smv": {
        source: "iana"
      },
      "audio/smv-qcp": {
        source: "iana"
      },
      "audio/smv0": {
        source: "iana"
      },
      "audio/sofa": {
        source: "iana"
      },
      "audio/sp-midi": {
        source: "iana"
      },
      "audio/speex": {
        source: "iana"
      },
      "audio/t140c": {
        source: "iana"
      },
      "audio/t38": {
        source: "iana"
      },
      "audio/telephone-event": {
        source: "iana"
      },
      "audio/tetra_acelp": {
        source: "iana"
      },
      "audio/tetra_acelp_bb": {
        source: "iana"
      },
      "audio/tone": {
        source: "iana"
      },
      "audio/tsvcis": {
        source: "iana"
      },
      "audio/uemclip": {
        source: "iana"
      },
      "audio/ulpfec": {
        source: "iana"
      },
      "audio/usac": {
        source: "iana"
      },
      "audio/vdvi": {
        source: "iana"
      },
      "audio/vmr-wb": {
        source: "iana"
      },
      "audio/vnd.3gpp.iufp": {
        source: "iana"
      },
      "audio/vnd.4sb": {
        source: "iana"
      },
      "audio/vnd.audiokoz": {
        source: "iana"
      },
      "audio/vnd.celp": {
        source: "iana"
      },
      "audio/vnd.cisco.nse": {
        source: "iana"
      },
      "audio/vnd.cmles.radio-events": {
        source: "iana"
      },
      "audio/vnd.cns.anp1": {
        source: "iana"
      },
      "audio/vnd.cns.inf1": {
        source: "iana"
      },
      "audio/vnd.dece.audio": {
        source: "iana",
        extensions: ["uva", "uvva"]
      },
      "audio/vnd.digital-winds": {
        source: "iana",
        extensions: ["eol"]
      },
      "audio/vnd.dlna.adts": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.1": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.2": {
        source: "iana"
      },
      "audio/vnd.dolby.mlp": {
        source: "iana"
      },
      "audio/vnd.dolby.mps": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2x": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2z": {
        source: "iana"
      },
      "audio/vnd.dolby.pulse.1": {
        source: "iana"
      },
      "audio/vnd.dra": {
        source: "iana",
        extensions: ["dra"]
      },
      "audio/vnd.dts": {
        source: "iana",
        extensions: ["dts"]
      },
      "audio/vnd.dts.hd": {
        source: "iana",
        extensions: ["dtshd"]
      },
      "audio/vnd.dts.uhd": {
        source: "iana"
      },
      "audio/vnd.dvb.file": {
        source: "iana"
      },
      "audio/vnd.everad.plj": {
        source: "iana"
      },
      "audio/vnd.hns.audio": {
        source: "iana"
      },
      "audio/vnd.lucent.voice": {
        source: "iana",
        extensions: ["lvp"]
      },
      "audio/vnd.ms-playready.media.pya": {
        source: "iana",
        extensions: ["pya"]
      },
      "audio/vnd.nokia.mobile-xmf": {
        source: "iana"
      },
      "audio/vnd.nortel.vbk": {
        source: "iana"
      },
      "audio/vnd.nuera.ecelp4800": {
        source: "iana",
        extensions: ["ecelp4800"]
      },
      "audio/vnd.nuera.ecelp7470": {
        source: "iana",
        extensions: ["ecelp7470"]
      },
      "audio/vnd.nuera.ecelp9600": {
        source: "iana",
        extensions: ["ecelp9600"]
      },
      "audio/vnd.octel.sbc": {
        source: "iana"
      },
      "audio/vnd.presonus.multitrack": {
        source: "iana"
      },
      "audio/vnd.qcelp": {
        source: "apache"
      },
      "audio/vnd.rhetorex.32kadpcm": {
        source: "iana"
      },
      "audio/vnd.rip": {
        source: "iana",
        extensions: ["rip"]
      },
      "audio/vnd.rn-realaudio": {
        compressible: false
      },
      "audio/vnd.sealedmedia.softseal.mpeg": {
        source: "iana"
      },
      "audio/vnd.vmx.cvsd": {
        source: "iana"
      },
      "audio/vnd.wave": {
        compressible: false
      },
      "audio/vorbis": {
        source: "iana",
        compressible: false
      },
      "audio/vorbis-config": {
        source: "iana"
      },
      "audio/wav": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/wave": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/webm": {
        source: "apache",
        compressible: false,
        extensions: ["weba"]
      },
      "audio/x-aac": {
        source: "apache",
        compressible: false,
        extensions: ["aac"]
      },
      "audio/x-aiff": {
        source: "apache",
        extensions: ["aif", "aiff", "aifc"]
      },
      "audio/x-caf": {
        source: "apache",
        compressible: false,
        extensions: ["caf"]
      },
      "audio/x-flac": {
        source: "apache",
        extensions: ["flac"]
      },
      "audio/x-m4a": {
        source: "nginx",
        extensions: ["m4a"]
      },
      "audio/x-matroska": {
        source: "apache",
        extensions: ["mka"]
      },
      "audio/x-mpegurl": {
        source: "apache",
        extensions: ["m3u"]
      },
      "audio/x-ms-wax": {
        source: "apache",
        extensions: ["wax"]
      },
      "audio/x-ms-wma": {
        source: "apache",
        extensions: ["wma"]
      },
      "audio/x-pn-realaudio": {
        source: "apache",
        extensions: ["ram", "ra"]
      },
      "audio/x-pn-realaudio-plugin": {
        source: "apache",
        extensions: ["rmp"]
      },
      "audio/x-realaudio": {
        source: "nginx",
        extensions: ["ra"]
      },
      "audio/x-tta": {
        source: "apache"
      },
      "audio/x-wav": {
        source: "apache",
        extensions: ["wav"]
      },
      "audio/xm": {
        source: "apache",
        extensions: ["xm"]
      },
      "chemical/x-cdx": {
        source: "apache",
        extensions: ["cdx"]
      },
      "chemical/x-cif": {
        source: "apache",
        extensions: ["cif"]
      },
      "chemical/x-cmdf": {
        source: "apache",
        extensions: ["cmdf"]
      },
      "chemical/x-cml": {
        source: "apache",
        extensions: ["cml"]
      },
      "chemical/x-csml": {
        source: "apache",
        extensions: ["csml"]
      },
      "chemical/x-pdb": {
        source: "apache"
      },
      "chemical/x-xyz": {
        source: "apache",
        extensions: ["xyz"]
      },
      "font/collection": {
        source: "iana",
        extensions: ["ttc"]
      },
      "font/otf": {
        source: "iana",
        compressible: true,
        extensions: ["otf"]
      },
      "font/sfnt": {
        source: "iana"
      },
      "font/ttf": {
        source: "iana",
        compressible: true,
        extensions: ["ttf"]
      },
      "font/woff": {
        source: "iana",
        extensions: ["woff"]
      },
      "font/woff2": {
        source: "iana",
        extensions: ["woff2"]
      },
      "image/aces": {
        source: "iana",
        extensions: ["exr"]
      },
      "image/apng": {
        source: "iana",
        compressible: false,
        extensions: ["apng"]
      },
      "image/avci": {
        source: "iana",
        extensions: ["avci"]
      },
      "image/avcs": {
        source: "iana",
        extensions: ["avcs"]
      },
      "image/avif": {
        source: "iana",
        compressible: false,
        extensions: ["avif"]
      },
      "image/bmp": {
        source: "iana",
        compressible: true,
        extensions: ["bmp", "dib"]
      },
      "image/cgm": {
        source: "iana",
        extensions: ["cgm"]
      },
      "image/dicom-rle": {
        source: "iana",
        extensions: ["drle"]
      },
      "image/dpx": {
        source: "iana",
        extensions: ["dpx"]
      },
      "image/emf": {
        source: "iana",
        extensions: ["emf"]
      },
      "image/fits": {
        source: "iana",
        extensions: ["fits"]
      },
      "image/g3fax": {
        source: "iana",
        extensions: ["g3"]
      },
      "image/gif": {
        source: "iana",
        compressible: false,
        extensions: ["gif"]
      },
      "image/heic": {
        source: "iana",
        extensions: ["heic"]
      },
      "image/heic-sequence": {
        source: "iana",
        extensions: ["heics"]
      },
      "image/heif": {
        source: "iana",
        extensions: ["heif"]
      },
      "image/heif-sequence": {
        source: "iana",
        extensions: ["heifs"]
      },
      "image/hej2k": {
        source: "iana",
        extensions: ["hej2"]
      },
      "image/ief": {
        source: "iana",
        extensions: ["ief"]
      },
      "image/j2c": {
        source: "iana"
      },
      "image/jaii": {
        source: "iana",
        extensions: ["jaii"]
      },
      "image/jais": {
        source: "iana",
        extensions: ["jais"]
      },
      "image/jls": {
        source: "iana",
        extensions: ["jls"]
      },
      "image/jp2": {
        source: "iana",
        compressible: false,
        extensions: ["jp2", "jpg2"]
      },
      "image/jpeg": {
        source: "iana",
        compressible: false,
        extensions: ["jpg", "jpeg", "jpe"]
      },
      "image/jph": {
        source: "iana",
        extensions: ["jph"]
      },
      "image/jphc": {
        source: "iana",
        extensions: ["jhc"]
      },
      "image/jpm": {
        source: "iana",
        compressible: false,
        extensions: ["jpm", "jpgm"]
      },
      "image/jpx": {
        source: "iana",
        compressible: false,
        extensions: ["jpx", "jpf"]
      },
      "image/jxl": {
        source: "iana",
        extensions: ["jxl"]
      },
      "image/jxr": {
        source: "iana",
        extensions: ["jxr"]
      },
      "image/jxra": {
        source: "iana",
        extensions: ["jxra"]
      },
      "image/jxrs": {
        source: "iana",
        extensions: ["jxrs"]
      },
      "image/jxs": {
        source: "iana",
        extensions: ["jxs"]
      },
      "image/jxsc": {
        source: "iana",
        extensions: ["jxsc"]
      },
      "image/jxsi": {
        source: "iana",
        extensions: ["jxsi"]
      },
      "image/jxss": {
        source: "iana",
        extensions: ["jxss"]
      },
      "image/ktx": {
        source: "iana",
        extensions: ["ktx"]
      },
      "image/ktx2": {
        source: "iana",
        extensions: ["ktx2"]
      },
      "image/naplps": {
        source: "iana"
      },
      "image/pjpeg": {
        compressible: false,
        extensions: ["jfif"]
      },
      "image/png": {
        source: "iana",
        compressible: false,
        extensions: ["png"]
      },
      "image/prs.btif": {
        source: "iana",
        extensions: ["btif", "btf"]
      },
      "image/prs.pti": {
        source: "iana",
        extensions: ["pti"]
      },
      "image/pwg-raster": {
        source: "iana"
      },
      "image/sgi": {
        source: "apache",
        extensions: ["sgi"]
      },
      "image/svg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["svg", "svgz"]
      },
      "image/t38": {
        source: "iana",
        extensions: ["t38"]
      },
      "image/tiff": {
        source: "iana",
        compressible: false,
        extensions: ["tif", "tiff"]
      },
      "image/tiff-fx": {
        source: "iana",
        extensions: ["tfx"]
      },
      "image/vnd.adobe.photoshop": {
        source: "iana",
        compressible: true,
        extensions: ["psd"]
      },
      "image/vnd.airzip.accelerator.azv": {
        source: "iana",
        extensions: ["azv"]
      },
      "image/vnd.clip": {
        source: "iana"
      },
      "image/vnd.cns.inf2": {
        source: "iana"
      },
      "image/vnd.dece.graphic": {
        source: "iana",
        extensions: ["uvi", "uvvi", "uvg", "uvvg"]
      },
      "image/vnd.djvu": {
        source: "iana",
        extensions: ["djvu", "djv"]
      },
      "image/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "image/vnd.dwg": {
        source: "iana",
        extensions: ["dwg"]
      },
      "image/vnd.dxf": {
        source: "iana",
        extensions: ["dxf"]
      },
      "image/vnd.fastbidsheet": {
        source: "iana",
        extensions: ["fbs"]
      },
      "image/vnd.fpx": {
        source: "iana",
        extensions: ["fpx"]
      },
      "image/vnd.fst": {
        source: "iana",
        extensions: ["fst"]
      },
      "image/vnd.fujixerox.edmics-mmr": {
        source: "iana",
        extensions: ["mmr"]
      },
      "image/vnd.fujixerox.edmics-rlc": {
        source: "iana",
        extensions: ["rlc"]
      },
      "image/vnd.globalgraphics.pgb": {
        source: "iana"
      },
      "image/vnd.microsoft.icon": {
        source: "iana",
        compressible: true,
        extensions: ["ico"]
      },
      "image/vnd.mix": {
        source: "iana"
      },
      "image/vnd.mozilla.apng": {
        source: "iana"
      },
      "image/vnd.ms-dds": {
        compressible: true,
        extensions: ["dds"]
      },
      "image/vnd.ms-modi": {
        source: "iana",
        extensions: ["mdi"]
      },
      "image/vnd.ms-photo": {
        source: "apache",
        extensions: ["wdp"]
      },
      "image/vnd.net-fpx": {
        source: "iana",
        extensions: ["npx"]
      },
      "image/vnd.pco.b16": {
        source: "iana",
        extensions: ["b16"]
      },
      "image/vnd.radiance": {
        source: "iana"
      },
      "image/vnd.sealed.png": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.gif": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.jpg": {
        source: "iana"
      },
      "image/vnd.svf": {
        source: "iana"
      },
      "image/vnd.tencent.tap": {
        source: "iana",
        extensions: ["tap"]
      },
      "image/vnd.valve.source.texture": {
        source: "iana",
        extensions: ["vtf"]
      },
      "image/vnd.wap.wbmp": {
        source: "iana",
        extensions: ["wbmp"]
      },
      "image/vnd.xiff": {
        source: "iana",
        extensions: ["xif"]
      },
      "image/vnd.zbrush.pcx": {
        source: "iana",
        extensions: ["pcx"]
      },
      "image/webp": {
        source: "iana",
        extensions: ["webp"]
      },
      "image/wmf": {
        source: "iana",
        extensions: ["wmf"]
      },
      "image/x-3ds": {
        source: "apache",
        extensions: ["3ds"]
      },
      "image/x-adobe-dng": {
        extensions: ["dng"]
      },
      "image/x-cmu-raster": {
        source: "apache",
        extensions: ["ras"]
      },
      "image/x-cmx": {
        source: "apache",
        extensions: ["cmx"]
      },
      "image/x-emf": {
        source: "iana"
      },
      "image/x-freehand": {
        source: "apache",
        extensions: ["fh", "fhc", "fh4", "fh5", "fh7"]
      },
      "image/x-icon": {
        source: "apache",
        compressible: true,
        extensions: ["ico"]
      },
      "image/x-jng": {
        source: "nginx",
        extensions: ["jng"]
      },
      "image/x-mrsid-image": {
        source: "apache",
        extensions: ["sid"]
      },
      "image/x-ms-bmp": {
        source: "nginx",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/x-pcx": {
        source: "apache",
        extensions: ["pcx"]
      },
      "image/x-pict": {
        source: "apache",
        extensions: ["pic", "pct"]
      },
      "image/x-portable-anymap": {
        source: "apache",
        extensions: ["pnm"]
      },
      "image/x-portable-bitmap": {
        source: "apache",
        extensions: ["pbm"]
      },
      "image/x-portable-graymap": {
        source: "apache",
        extensions: ["pgm"]
      },
      "image/x-portable-pixmap": {
        source: "apache",
        extensions: ["ppm"]
      },
      "image/x-rgb": {
        source: "apache",
        extensions: ["rgb"]
      },
      "image/x-tga": {
        source: "apache",
        extensions: ["tga"]
      },
      "image/x-wmf": {
        source: "iana"
      },
      "image/x-xbitmap": {
        source: "apache",
        extensions: ["xbm"]
      },
      "image/x-xcf": {
        compressible: false
      },
      "image/x-xpixmap": {
        source: "apache",
        extensions: ["xpm"]
      },
      "image/x-xwindowdump": {
        source: "apache",
        extensions: ["xwd"]
      },
      "message/bhttp": {
        source: "iana"
      },
      "message/cpim": {
        source: "iana"
      },
      "message/delivery-status": {
        source: "iana"
      },
      "message/disposition-notification": {
        source: "iana",
        extensions: [
          "disposition-notification"
        ]
      },
      "message/external-body": {
        source: "iana"
      },
      "message/feedback-report": {
        source: "iana"
      },
      "message/global": {
        source: "iana",
        extensions: ["u8msg"]
      },
      "message/global-delivery-status": {
        source: "iana",
        extensions: ["u8dsn"]
      },
      "message/global-disposition-notification": {
        source: "iana",
        extensions: ["u8mdn"]
      },
      "message/global-headers": {
        source: "iana",
        extensions: ["u8hdr"]
      },
      "message/http": {
        source: "iana",
        compressible: false
      },
      "message/imdn+xml": {
        source: "iana",
        compressible: true
      },
      "message/mls": {
        source: "iana"
      },
      "message/news": {
        source: "apache"
      },
      "message/ohttp-req": {
        source: "iana"
      },
      "message/ohttp-res": {
        source: "iana"
      },
      "message/partial": {
        source: "iana",
        compressible: false
      },
      "message/rfc822": {
        source: "iana",
        compressible: true,
        extensions: ["eml", "mime", "mht", "mhtml"]
      },
      "message/s-http": {
        source: "apache"
      },
      "message/sip": {
        source: "iana"
      },
      "message/sipfrag": {
        source: "iana"
      },
      "message/tracking-status": {
        source: "iana"
      },
      "message/vnd.si.simp": {
        source: "apache"
      },
      "message/vnd.wfa.wsc": {
        source: "iana",
        extensions: ["wsc"]
      },
      "model/3mf": {
        source: "iana",
        extensions: ["3mf"]
      },
      "model/e57": {
        source: "iana"
      },
      "model/gltf+json": {
        source: "iana",
        compressible: true,
        extensions: ["gltf"]
      },
      "model/gltf-binary": {
        source: "iana",
        compressible: true,
        extensions: ["glb"]
      },
      "model/iges": {
        source: "iana",
        compressible: false,
        extensions: ["igs", "iges"]
      },
      "model/jt": {
        source: "iana",
        extensions: ["jt"]
      },
      "model/mesh": {
        source: "iana",
        compressible: false,
        extensions: ["msh", "mesh", "silo"]
      },
      "model/mtl": {
        source: "iana",
        extensions: ["mtl"]
      },
      "model/obj": {
        source: "iana",
        extensions: ["obj"]
      },
      "model/prc": {
        source: "iana",
        extensions: ["prc"]
      },
      "model/step": {
        source: "iana",
        extensions: ["step", "stp", "stpnc", "p21", "210"]
      },
      "model/step+xml": {
        source: "iana",
        compressible: true,
        extensions: ["stpx"]
      },
      "model/step+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpz"]
      },
      "model/step-xml+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpxz"]
      },
      "model/stl": {
        source: "iana",
        extensions: ["stl"]
      },
      "model/u3d": {
        source: "iana",
        extensions: ["u3d"]
      },
      "model/vnd.bary": {
        source: "iana",
        extensions: ["bary"]
      },
      "model/vnd.cld": {
        source: "iana",
        extensions: ["cld"]
      },
      "model/vnd.collada+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dae"]
      },
      "model/vnd.dwf": {
        source: "iana",
        extensions: ["dwf"]
      },
      "model/vnd.flatland.3dml": {
        source: "iana"
      },
      "model/vnd.gdl": {
        source: "iana",
        extensions: ["gdl"]
      },
      "model/vnd.gs-gdl": {
        source: "apache"
      },
      "model/vnd.gs.gdl": {
        source: "iana"
      },
      "model/vnd.gtw": {
        source: "iana",
        extensions: ["gtw"]
      },
      "model/vnd.moml+xml": {
        source: "iana",
        compressible: true
      },
      "model/vnd.mts": {
        source: "iana",
        extensions: ["mts"]
      },
      "model/vnd.opengex": {
        source: "iana",
        extensions: ["ogex"]
      },
      "model/vnd.parasolid.transmit.binary": {
        source: "iana",
        extensions: ["x_b"]
      },
      "model/vnd.parasolid.transmit.text": {
        source: "iana",
        extensions: ["x_t"]
      },
      "model/vnd.pytha.pyox": {
        source: "iana",
        extensions: ["pyo", "pyox"]
      },
      "model/vnd.rosette.annotated-data-model": {
        source: "iana"
      },
      "model/vnd.sap.vds": {
        source: "iana",
        extensions: ["vds"]
      },
      "model/vnd.usda": {
        source: "iana",
        extensions: ["usda"]
      },
      "model/vnd.usdz+zip": {
        source: "iana",
        compressible: false,
        extensions: ["usdz"]
      },
      "model/vnd.valve.source.compiled-map": {
        source: "iana",
        extensions: ["bsp"]
      },
      "model/vnd.vtu": {
        source: "iana",
        extensions: ["vtu"]
      },
      "model/vrml": {
        source: "iana",
        compressible: false,
        extensions: ["wrl", "vrml"]
      },
      "model/x3d+binary": {
        source: "apache",
        compressible: false,
        extensions: ["x3db", "x3dbz"]
      },
      "model/x3d+fastinfoset": {
        source: "iana",
        extensions: ["x3db"]
      },
      "model/x3d+vrml": {
        source: "apache",
        compressible: false,
        extensions: ["x3dv", "x3dvz"]
      },
      "model/x3d+xml": {
        source: "iana",
        compressible: true,
        extensions: ["x3d", "x3dz"]
      },
      "model/x3d-vrml": {
        source: "iana",
        extensions: ["x3dv"]
      },
      "multipart/alternative": {
        source: "iana",
        compressible: false
      },
      "multipart/appledouble": {
        source: "iana"
      },
      "multipart/byteranges": {
        source: "iana"
      },
      "multipart/digest": {
        source: "iana"
      },
      "multipart/encrypted": {
        source: "iana",
        compressible: false
      },
      "multipart/form-data": {
        source: "iana",
        compressible: false
      },
      "multipart/header-set": {
        source: "iana"
      },
      "multipart/mixed": {
        source: "iana"
      },
      "multipart/multilingual": {
        source: "iana"
      },
      "multipart/parallel": {
        source: "iana"
      },
      "multipart/related": {
        source: "iana",
        compressible: false
      },
      "multipart/report": {
        source: "iana"
      },
      "multipart/signed": {
        source: "iana",
        compressible: false
      },
      "multipart/vnd.bint.med-plus": {
        source: "iana"
      },
      "multipart/voice-message": {
        source: "iana"
      },
      "multipart/x-mixed-replace": {
        source: "iana"
      },
      "text/1d-interleaved-parityfec": {
        source: "iana"
      },
      "text/cache-manifest": {
        source: "iana",
        compressible: true,
        extensions: ["appcache", "manifest"]
      },
      "text/calendar": {
        source: "iana",
        extensions: ["ics", "ifb"]
      },
      "text/calender": {
        compressible: true
      },
      "text/cmd": {
        compressible: true
      },
      "text/coffeescript": {
        extensions: ["coffee", "litcoffee"]
      },
      "text/cql": {
        source: "iana"
      },
      "text/cql-expression": {
        source: "iana"
      },
      "text/cql-identifier": {
        source: "iana"
      },
      "text/css": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["css"]
      },
      "text/csv": {
        source: "iana",
        compressible: true,
        extensions: ["csv"]
      },
      "text/csv-schema": {
        source: "iana"
      },
      "text/directory": {
        source: "iana"
      },
      "text/dns": {
        source: "iana"
      },
      "text/ecmascript": {
        source: "apache"
      },
      "text/encaprtp": {
        source: "iana"
      },
      "text/enriched": {
        source: "iana"
      },
      "text/fhirpath": {
        source: "iana"
      },
      "text/flexfec": {
        source: "iana"
      },
      "text/fwdred": {
        source: "iana"
      },
      "text/gff3": {
        source: "iana"
      },
      "text/grammar-ref-list": {
        source: "iana"
      },
      "text/hl7v2": {
        source: "iana"
      },
      "text/html": {
        source: "iana",
        compressible: true,
        extensions: ["html", "htm", "shtml"]
      },
      "text/jade": {
        extensions: ["jade"]
      },
      "text/javascript": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["js", "mjs"]
      },
      "text/jcr-cnd": {
        source: "iana"
      },
      "text/jsx": {
        compressible: true,
        extensions: ["jsx"]
      },
      "text/less": {
        compressible: true,
        extensions: ["less"]
      },
      "text/markdown": {
        source: "iana",
        compressible: true,
        extensions: ["md", "markdown"]
      },
      "text/mathml": {
        source: "nginx",
        extensions: ["mml"]
      },
      "text/mdx": {
        compressible: true,
        extensions: ["mdx"]
      },
      "text/mizar": {
        source: "iana"
      },
      "text/n3": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["n3"]
      },
      "text/parameters": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/parityfec": {
        source: "iana"
      },
      "text/plain": {
        source: "iana",
        compressible: true,
        extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
      },
      "text/provenance-notation": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/prs.fallenstein.rst": {
        source: "iana"
      },
      "text/prs.lines.tag": {
        source: "iana",
        extensions: ["dsc"]
      },
      "text/prs.prop.logic": {
        source: "iana"
      },
      "text/prs.texi": {
        source: "iana"
      },
      "text/raptorfec": {
        source: "iana"
      },
      "text/red": {
        source: "iana"
      },
      "text/rfc822-headers": {
        source: "iana"
      },
      "text/richtext": {
        source: "iana",
        compressible: true,
        extensions: ["rtx"]
      },
      "text/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "text/rtp-enc-aescm128": {
        source: "iana"
      },
      "text/rtploopback": {
        source: "iana"
      },
      "text/rtx": {
        source: "iana"
      },
      "text/sgml": {
        source: "iana",
        extensions: ["sgml", "sgm"]
      },
      "text/shaclc": {
        source: "iana"
      },
      "text/shex": {
        source: "iana",
        extensions: ["shex"]
      },
      "text/slim": {
        extensions: ["slim", "slm"]
      },
      "text/spdx": {
        source: "iana",
        extensions: ["spdx"]
      },
      "text/strings": {
        source: "iana"
      },
      "text/stylus": {
        extensions: ["stylus", "styl"]
      },
      "text/t140": {
        source: "iana"
      },
      "text/tab-separated-values": {
        source: "iana",
        compressible: true,
        extensions: ["tsv"]
      },
      "text/troff": {
        source: "iana",
        extensions: ["t", "tr", "roff", "man", "me", "ms"]
      },
      "text/turtle": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["ttl"]
      },
      "text/ulpfec": {
        source: "iana"
      },
      "text/uri-list": {
        source: "iana",
        compressible: true,
        extensions: ["uri", "uris", "urls"]
      },
      "text/vcard": {
        source: "iana",
        compressible: true,
        extensions: ["vcard"]
      },
      "text/vnd.a": {
        source: "iana"
      },
      "text/vnd.abc": {
        source: "iana"
      },
      "text/vnd.ascii-art": {
        source: "iana"
      },
      "text/vnd.curl": {
        source: "iana",
        extensions: ["curl"]
      },
      "text/vnd.curl.dcurl": {
        source: "apache",
        extensions: ["dcurl"]
      },
      "text/vnd.curl.mcurl": {
        source: "apache",
        extensions: ["mcurl"]
      },
      "text/vnd.curl.scurl": {
        source: "apache",
        extensions: ["scurl"]
      },
      "text/vnd.debian.copyright": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.dmclientscript": {
        source: "iana"
      },
      "text/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "text/vnd.esmertec.theme-descriptor": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.exchangeable": {
        source: "iana"
      },
      "text/vnd.familysearch.gedcom": {
        source: "iana",
        extensions: ["ged"]
      },
      "text/vnd.ficlab.flt": {
        source: "iana"
      },
      "text/vnd.fly": {
        source: "iana",
        extensions: ["fly"]
      },
      "text/vnd.fmi.flexstor": {
        source: "iana",
        extensions: ["flx"]
      },
      "text/vnd.gml": {
        source: "iana"
      },
      "text/vnd.graphviz": {
        source: "iana",
        extensions: ["gv"]
      },
      "text/vnd.hans": {
        source: "iana"
      },
      "text/vnd.hgl": {
        source: "iana"
      },
      "text/vnd.in3d.3dml": {
        source: "iana",
        extensions: ["3dml"]
      },
      "text/vnd.in3d.spot": {
        source: "iana",
        extensions: ["spot"]
      },
      "text/vnd.iptc.newsml": {
        source: "iana"
      },
      "text/vnd.iptc.nitf": {
        source: "iana"
      },
      "text/vnd.latex-z": {
        source: "iana"
      },
      "text/vnd.motorola.reflex": {
        source: "iana"
      },
      "text/vnd.ms-mediapackage": {
        source: "iana"
      },
      "text/vnd.net2phone.commcenter.command": {
        source: "iana"
      },
      "text/vnd.radisys.msml-basic-layout": {
        source: "iana"
      },
      "text/vnd.senx.warpscript": {
        source: "iana"
      },
      "text/vnd.si.uricatalogue": {
        source: "apache"
      },
      "text/vnd.sosi": {
        source: "iana"
      },
      "text/vnd.sun.j2me.app-descriptor": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["jad"]
      },
      "text/vnd.trolltech.linguist": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.vcf": {
        source: "iana"
      },
      "text/vnd.wap.si": {
        source: "iana"
      },
      "text/vnd.wap.sl": {
        source: "iana"
      },
      "text/vnd.wap.wml": {
        source: "iana",
        extensions: ["wml"]
      },
      "text/vnd.wap.wmlscript": {
        source: "iana",
        extensions: ["wmls"]
      },
      "text/vnd.zoo.kcl": {
        source: "iana"
      },
      "text/vtt": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["vtt"]
      },
      "text/wgsl": {
        source: "iana",
        extensions: ["wgsl"]
      },
      "text/x-asm": {
        source: "apache",
        extensions: ["s", "asm"]
      },
      "text/x-c": {
        source: "apache",
        extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"]
      },
      "text/x-component": {
        source: "nginx",
        extensions: ["htc"]
      },
      "text/x-fortran": {
        source: "apache",
        extensions: ["f", "for", "f77", "f90"]
      },
      "text/x-gwt-rpc": {
        compressible: true
      },
      "text/x-handlebars-template": {
        extensions: ["hbs"]
      },
      "text/x-java-source": {
        source: "apache",
        extensions: ["java"]
      },
      "text/x-jquery-tmpl": {
        compressible: true
      },
      "text/x-lua": {
        extensions: ["lua"]
      },
      "text/x-markdown": {
        compressible: true,
        extensions: ["mkd"]
      },
      "text/x-nfo": {
        source: "apache",
        extensions: ["nfo"]
      },
      "text/x-opml": {
        source: "apache",
        extensions: ["opml"]
      },
      "text/x-org": {
        compressible: true,
        extensions: ["org"]
      },
      "text/x-pascal": {
        source: "apache",
        extensions: ["p", "pas"]
      },
      "text/x-processing": {
        compressible: true,
        extensions: ["pde"]
      },
      "text/x-sass": {
        extensions: ["sass"]
      },
      "text/x-scss": {
        extensions: ["scss"]
      },
      "text/x-setext": {
        source: "apache",
        extensions: ["etx"]
      },
      "text/x-sfv": {
        source: "apache",
        extensions: ["sfv"]
      },
      "text/x-suse-ymp": {
        compressible: true,
        extensions: ["ymp"]
      },
      "text/x-uuencode": {
        source: "apache",
        extensions: ["uu"]
      },
      "text/x-vcalendar": {
        source: "apache",
        extensions: ["vcs"]
      },
      "text/x-vcard": {
        source: "apache",
        extensions: ["vcf"]
      },
      "text/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml"]
      },
      "text/xml-external-parsed-entity": {
        source: "iana"
      },
      "text/yaml": {
        compressible: true,
        extensions: ["yaml", "yml"]
      },
      "video/1d-interleaved-parityfec": {
        source: "iana"
      },
      "video/3gpp": {
        source: "iana",
        extensions: ["3gp", "3gpp"]
      },
      "video/3gpp-tt": {
        source: "iana"
      },
      "video/3gpp2": {
        source: "iana",
        extensions: ["3g2"]
      },
      "video/av1": {
        source: "iana"
      },
      "video/bmpeg": {
        source: "iana"
      },
      "video/bt656": {
        source: "iana"
      },
      "video/celb": {
        source: "iana"
      },
      "video/dv": {
        source: "iana"
      },
      "video/encaprtp": {
        source: "iana"
      },
      "video/evc": {
        source: "iana"
      },
      "video/ffv1": {
        source: "iana"
      },
      "video/flexfec": {
        source: "iana"
      },
      "video/h261": {
        source: "iana",
        extensions: ["h261"]
      },
      "video/h263": {
        source: "iana",
        extensions: ["h263"]
      },
      "video/h263-1998": {
        source: "iana"
      },
      "video/h263-2000": {
        source: "iana"
      },
      "video/h264": {
        source: "iana",
        extensions: ["h264"]
      },
      "video/h264-rcdo": {
        source: "iana"
      },
      "video/h264-svc": {
        source: "iana"
      },
      "video/h265": {
        source: "iana"
      },
      "video/h266": {
        source: "iana"
      },
      "video/iso.segment": {
        source: "iana",
        extensions: ["m4s"]
      },
      "video/jpeg": {
        source: "iana",
        extensions: ["jpgv"]
      },
      "video/jpeg2000": {
        source: "iana"
      },
      "video/jpm": {
        source: "apache",
        extensions: ["jpm", "jpgm"]
      },
      "video/jxsv": {
        source: "iana"
      },
      "video/lottie+json": {
        source: "iana",
        compressible: true
      },
      "video/matroska": {
        source: "iana"
      },
      "video/matroska-3d": {
        source: "iana"
      },
      "video/mj2": {
        source: "iana",
        extensions: ["mj2", "mjp2"]
      },
      "video/mp1s": {
        source: "iana"
      },
      "video/mp2p": {
        source: "iana"
      },
      "video/mp2t": {
        source: "iana",
        extensions: ["ts", "m2t", "m2ts", "mts"]
      },
      "video/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["mp4", "mp4v", "mpg4"]
      },
      "video/mp4v-es": {
        source: "iana"
      },
      "video/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
      },
      "video/mpeg4-generic": {
        source: "iana"
      },
      "video/mpv": {
        source: "iana"
      },
      "video/nv": {
        source: "iana"
      },
      "video/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogv"]
      },
      "video/parityfec": {
        source: "iana"
      },
      "video/pointer": {
        source: "iana"
      },
      "video/quicktime": {
        source: "iana",
        compressible: false,
        extensions: ["qt", "mov"]
      },
      "video/raptorfec": {
        source: "iana"
      },
      "video/raw": {
        source: "iana"
      },
      "video/rtp-enc-aescm128": {
        source: "iana"
      },
      "video/rtploopback": {
        source: "iana"
      },
      "video/rtx": {
        source: "iana"
      },
      "video/scip": {
        source: "iana"
      },
      "video/smpte291": {
        source: "iana"
      },
      "video/smpte292m": {
        source: "iana"
      },
      "video/ulpfec": {
        source: "iana"
      },
      "video/vc1": {
        source: "iana"
      },
      "video/vc2": {
        source: "iana"
      },
      "video/vnd.cctv": {
        source: "iana"
      },
      "video/vnd.dece.hd": {
        source: "iana",
        extensions: ["uvh", "uvvh"]
      },
      "video/vnd.dece.mobile": {
        source: "iana",
        extensions: ["uvm", "uvvm"]
      },
      "video/vnd.dece.mp4": {
        source: "iana"
      },
      "video/vnd.dece.pd": {
        source: "iana",
        extensions: ["uvp", "uvvp"]
      },
      "video/vnd.dece.sd": {
        source: "iana",
        extensions: ["uvs", "uvvs"]
      },
      "video/vnd.dece.video": {
        source: "iana",
        extensions: ["uvv", "uvvv"]
      },
      "video/vnd.directv.mpeg": {
        source: "iana"
      },
      "video/vnd.directv.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dlna.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dvb.file": {
        source: "iana",
        extensions: ["dvb"]
      },
      "video/vnd.fvt": {
        source: "iana",
        extensions: ["fvt"]
      },
      "video/vnd.hns.video": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsavc": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsmpeg2": {
        source: "iana"
      },
      "video/vnd.motorola.video": {
        source: "iana"
      },
      "video/vnd.motorola.videop": {
        source: "iana"
      },
      "video/vnd.mpegurl": {
        source: "iana",
        extensions: ["mxu", "m4u"]
      },
      "video/vnd.ms-playready.media.pyv": {
        source: "iana",
        extensions: ["pyv"]
      },
      "video/vnd.nokia.interleaved-multimedia": {
        source: "iana"
      },
      "video/vnd.nokia.mp4vr": {
        source: "iana"
      },
      "video/vnd.nokia.videovoip": {
        source: "iana"
      },
      "video/vnd.objectvideo": {
        source: "iana"
      },
      "video/vnd.planar": {
        source: "iana"
      },
      "video/vnd.radgamettools.bink": {
        source: "iana"
      },
      "video/vnd.radgamettools.smacker": {
        source: "apache"
      },
      "video/vnd.sealed.mpeg1": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg4": {
        source: "iana"
      },
      "video/vnd.sealed.swf": {
        source: "iana"
      },
      "video/vnd.sealedmedia.softseal.mov": {
        source: "iana"
      },
      "video/vnd.uvvu.mp4": {
        source: "iana",
        extensions: ["uvu", "uvvu"]
      },
      "video/vnd.vivo": {
        source: "iana",
        extensions: ["viv"]
      },
      "video/vnd.youtube.yt": {
        source: "iana"
      },
      "video/vp8": {
        source: "iana"
      },
      "video/vp9": {
        source: "iana"
      },
      "video/webm": {
        source: "apache",
        compressible: false,
        extensions: ["webm"]
      },
      "video/x-f4v": {
        source: "apache",
        extensions: ["f4v"]
      },
      "video/x-fli": {
        source: "apache",
        extensions: ["fli"]
      },
      "video/x-flv": {
        source: "apache",
        compressible: false,
        extensions: ["flv"]
      },
      "video/x-m4v": {
        source: "apache",
        extensions: ["m4v"]
      },
      "video/x-matroska": {
        source: "apache",
        compressible: false,
        extensions: ["mkv", "mk3d", "mks"]
      },
      "video/x-mng": {
        source: "apache",
        extensions: ["mng"]
      },
      "video/x-ms-asf": {
        source: "apache",
        extensions: ["asf", "asx"]
      },
      "video/x-ms-vob": {
        source: "apache",
        extensions: ["vob"]
      },
      "video/x-ms-wm": {
        source: "apache",
        extensions: ["wm"]
      },
      "video/x-ms-wmv": {
        source: "apache",
        compressible: false,
        extensions: ["wmv"]
      },
      "video/x-ms-wmx": {
        source: "apache",
        extensions: ["wmx"]
      },
      "video/x-ms-wvx": {
        source: "apache",
        extensions: ["wvx"]
      },
      "video/x-msvideo": {
        source: "apache",
        extensions: ["avi"]
      },
      "video/x-sgi-movie": {
        source: "apache",
        extensions: ["movie"]
      },
      "video/x-smv": {
        source: "apache",
        extensions: ["smv"]
      },
      "x-conference/x-cooltalk": {
        source: "apache",
        extensions: ["ice"]
      },
      "x-shader/x-fragment": {
        compressible: true
      },
      "x-shader/x-vertex": {
        compressible: true
      }
    };
  }
});

// node_modules/mime-db/index.js
var require_mime_db = __commonJS({
  "node_modules/mime-db/index.js"(exports2, module2) {
    module2.exports = require_db();
  }
});

// node_modules/compressible/index.js
var require_compressible = __commonJS({
  "node_modules/compressible/index.js"(exports2, module2) {
    "use strict";
    var db = require_mime_db();
    var COMPRESSIBLE_TYPE_REGEXP = /^text\/|\+(?:json|text|xml)$/i;
    var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
    module2.exports = compressible;
    function compressible(type) {
      if (!type || typeof type !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type);
      var mime = match && match[1].toLowerCase();
      var data = db[mime];
      if (data && data.compressible !== void 0) {
        return data.compressible;
      }
      return COMPRESSIBLE_TYPE_REGEXP.test(mime) || void 0;
    }
  }
});

// node_modules/compression/node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/compression/node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isNaN(val) === false) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      if (ms >= d) {
        return Math.round(ms / d) + "d";
      }
      if (ms >= h) {
        return Math.round(ms / h) + "h";
      }
      if (ms >= m) {
        return Math.round(ms / m) + "m";
      }
      if (ms >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      return plural(ms, d, "day") || plural(ms, h, "hour") || plural(ms, m, "minute") || plural(ms, s, "second") || ms + " ms";
    }
    function plural(ms, n, name) {
      if (ms < n) {
        return;
      }
      if (ms < n * 1.5) {
        return Math.floor(ms / n) + " " + name;
      }
      return Math.ceil(ms / n) + " " + name + "s";
    }
  }
});

// node_modules/compression/node_modules/debug/src/debug.js
var require_debug = __commonJS({
  "node_modules/compression/node_modules/debug/src/debug.js"(exports2, module2) {
    exports2 = module2.exports = createDebug.debug = createDebug["default"] = createDebug;
    exports2.coerce = coerce;
    exports2.disable = disable;
    exports2.enable = enable;
    exports2.enabled = enabled;
    exports2.humanize = require_ms();
    exports2.names = [];
    exports2.skips = [];
    exports2.formatters = {};
    var prevTime;
    function selectColor(namespace) {
      var hash = 0, i;
      for (i in namespace) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return exports2.colors[Math.abs(hash) % exports2.colors.length];
    }
    function createDebug(namespace) {
      function debug() {
        if (!debug.enabled) return;
        var self = debug;
        var curr = +/* @__PURE__ */ new Date();
        var ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        args[0] = exports2.coerce(args[0]);
        if ("string" !== typeof args[0]) {
          args.unshift("%O");
        }
        var index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
          if (match === "%%") return match;
          index++;
          var formatter = exports2.formatters[format];
          if ("function" === typeof formatter) {
            var val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        exports2.formatArgs.call(self, args);
        var logFn = debug.log || exports2.log || console.log.bind(console);
        logFn.apply(self, args);
      }
      debug.namespace = namespace;
      debug.enabled = exports2.enabled(namespace);
      debug.useColors = exports2.useColors();
      debug.color = selectColor(namespace);
      if ("function" === typeof exports2.init) {
        exports2.init(debug);
      }
      return debug;
    }
    function enable(namespaces) {
      exports2.save(namespaces);
      exports2.names = [];
      exports2.skips = [];
      var split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
      var len = split.length;
      for (var i = 0; i < len; i++) {
        if (!split[i]) continue;
        namespaces = split[i].replace(/\*/g, ".*?");
        if (namespaces[0] === "-") {
          exports2.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
        } else {
          exports2.names.push(new RegExp("^" + namespaces + "$"));
        }
      }
    }
    function disable() {
      exports2.enable("");
    }
    function enabled(name) {
      var i, len;
      for (i = 0, len = exports2.skips.length; i < len; i++) {
        if (exports2.skips[i].test(name)) {
          return false;
        }
      }
      for (i = 0, len = exports2.names.length; i < len; i++) {
        if (exports2.names[i].test(name)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) return val.stack || val.message;
      return val;
    }
  }
});

// node_modules/compression/node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/compression/node_modules/debug/src/browser.js"(exports2, module2) {
    exports2 = module2.exports = require_debug();
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = "undefined" != typeof chrome && "undefined" != typeof chrome.storage ? chrome.storage.local : localstorage();
    exports2.colors = [
      "lightseagreen",
      "forestgreen",
      "goldenrod",
      "dodgerblue",
      "darkorchid",
      "crimson"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && window.process.type === "renderer") {
        return true;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    exports2.formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (err) {
        return "[UnexpectedJSONParseError]: " + err.message;
      }
    };
    function formatArgs(args) {
      var useColors2 = this.useColors;
      args[0] = (useColors2 ? "%c" : "") + this.namespace + (useColors2 ? " %c" : " ") + args[0] + (useColors2 ? "%c " : " ") + "+" + exports2.humanize(this.diff);
      if (!useColors2) return;
      var c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      var index = 0;
      var lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, function(match) {
        if ("%%" === match) return;
        index++;
        if ("%c" === match) {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    function log() {
      return "object" === typeof console && console.log && Function.prototype.apply.call(console.log, console, arguments);
    }
    function save(namespaces) {
      try {
        if (null == namespaces) {
          exports2.storage.removeItem("debug");
        } else {
          exports2.storage.debug = namespaces;
        }
      } catch (e) {
      }
    }
    function load() {
      var r;
      try {
        r = exports2.storage.debug;
      } catch (e) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    exports2.enable(load());
    function localstorage() {
      try {
        return window.localStorage;
      } catch (e) {
      }
    }
  }
});

// node_modules/compression/node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/compression/node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util = require("util");
    exports2 = module2.exports = require_debug();
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.colors = [6, 2, 3, 4, 5, 1];
    exports2.inspectOpts = Object.keys(process.env).filter(function(key) {
      return /^debug_/i.test(key);
    }).reduce(function(obj, key) {
      var prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, function(_, k) {
        return k.toUpperCase();
      });
      var val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
      else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
      else if (val === "null") val = null;
      else val = Number(val);
      obj[prop] = val;
      return obj;
    }, {});
    var fd = parseInt(process.env.DEBUG_FD, 10) || 2;
    if (1 !== fd && 2 !== fd) {
      util.deprecate(function() {
      }, "except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)")();
    }
    var stream = 1 === fd ? process.stdout : 2 === fd ? process.stderr : createWritableStdioStream(fd);
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(fd);
    }
    exports2.formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map(function(str) {
        return str.trim();
      }).join(" ");
    };
    exports2.formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
    function formatArgs(args) {
      var name = this.namespace;
      var useColors2 = this.useColors;
      if (useColors2) {
        var c = this.color;
        var prefix = "  \x1B[3" + c + ";1m" + name + " \x1B[0m";
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push("\x1B[3" + c + "m+" + exports2.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = (/* @__PURE__ */ new Date()).toUTCString() + " " + name + " " + args[0];
      }
    }
    function log() {
      return stream.write(util.format.apply(util, arguments) + "\n");
    }
    function save(namespaces) {
      if (null == namespaces) {
        delete process.env.DEBUG;
      } else {
        process.env.DEBUG = namespaces;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function createWritableStdioStream(fd2) {
      var stream2;
      var tty_wrap = process.binding("tty_wrap");
      switch (tty_wrap.guessHandleType(fd2)) {
        case "TTY":
          stream2 = new tty.WriteStream(fd2);
          stream2._type = "tty";
          if (stream2._handle && stream2._handle.unref) {
            stream2._handle.unref();
          }
          break;
        case "FILE":
          var fs = require("fs");
          stream2 = new fs.SyncWriteStream(fd2, { autoClose: false });
          stream2._type = "fs";
          break;
        case "PIPE":
        case "TCP":
          var net = require("net");
          stream2 = new net.Socket({
            fd: fd2,
            readable: false,
            writable: true
          });
          stream2.readable = false;
          stream2.read = null;
          stream2._type = "pipe";
          if (stream2._handle && stream2._handle.unref) {
            stream2._handle.unref();
          }
          break;
        default:
          throw new Error("Implement me. Unknown stream file type!");
      }
      stream2.fd = fd2;
      stream2._isStdio = true;
      return stream2;
    }
    function init(debug) {
      debug.inspectOpts = {};
      var keys = Object.keys(exports2.inspectOpts);
      for (var i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    exports2.enable(load());
  }
});

// node_modules/compression/node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/compression/node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process !== "undefined" && process.type === "renderer") {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// node_modules/on-headers/index.js
var require_on_headers = __commonJS({
  "node_modules/on-headers/index.js"(exports2, module2) {
    "use strict";
    module2.exports = onHeaders;
    var http = require("http");
    var isAppendHeaderSupported = typeof http.ServerResponse.prototype.appendHeader === "function";
    var set1dArray = isAppendHeaderSupported ? set1dArrayWithAppend : set1dArrayWithSet;
    function createWriteHead(prevWriteHead, listener) {
      var fired = false;
      return function writeHead(statusCode) {
        var args = setWriteHeadHeaders.apply(this, arguments);
        if (!fired) {
          fired = true;
          listener.call(this);
          if (typeof args[0] === "number" && this.statusCode !== args[0]) {
            args[0] = this.statusCode;
            args.length = 1;
          }
        }
        return prevWriteHead.apply(this, args);
      };
    }
    function onHeaders(res, listener) {
      if (!res) {
        throw new TypeError("argument res is required");
      }
      if (typeof listener !== "function") {
        throw new TypeError("argument listener must be a function");
      }
      res.writeHead = createWriteHead(res.writeHead, listener);
    }
    function setHeadersFromArray(res, headers) {
      if (headers.length && Array.isArray(headers[0])) {
        set2dArray(res, headers);
      } else {
        if (headers.length % 2 !== 0) {
          throw new TypeError("headers array is malformed");
        }
        set1dArray(res, headers);
      }
    }
    function setHeadersFromObject(res, headers) {
      var keys = Object.keys(headers);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k) res.setHeader(k, headers[k]);
      }
    }
    function setWriteHeadHeaders(statusCode) {
      var length = arguments.length;
      var headerIndex = length > 1 && typeof arguments[1] === "string" ? 2 : 1;
      var headers = length >= headerIndex + 1 ? arguments[headerIndex] : void 0;
      this.statusCode = statusCode;
      if (Array.isArray(headers)) {
        setHeadersFromArray(this, headers);
      } else if (headers) {
        setHeadersFromObject(this, headers);
      }
      var args = new Array(Math.min(length, headerIndex));
      for (var i = 0; i < args.length; i++) {
        args[i] = arguments[i];
      }
      return args;
    }
    function set2dArray(res, headers) {
      var key;
      for (var i = 0; i < headers.length; i++) {
        key = headers[i][0];
        if (key) {
          res.setHeader(key, headers[i][1]);
        }
      }
    }
    function set1dArrayWithAppend(res, headers) {
      for (var i = 0; i < headers.length; i += 2) {
        res.removeHeader(headers[i]);
      }
      var key;
      for (var j = 0; j < headers.length; j += 2) {
        key = headers[j];
        if (key) {
          res.appendHeader(key, headers[j + 1]);
        }
      }
    }
    function set1dArrayWithSet(res, headers) {
      var key;
      for (var i = 0; i < headers.length; i += 2) {
        key = headers[i];
        if (key) {
          res.setHeader(key, headers[i + 1]);
        }
      }
    }
  }
});

// node_modules/vary/index.js
var require_vary = __commonJS({
  "node_modules/vary/index.js"(exports2, module2) {
    "use strict";
    module2.exports = vary;
    module2.exports.append = append;
    var FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
    function append(header, field) {
      if (typeof header !== "string") {
        throw new TypeError("header argument is required");
      }
      if (!field) {
        throw new TypeError("field argument is required");
      }
      var fields = !Array.isArray(field) ? parse(String(field)) : field;
      for (var j = 0; j < fields.length; j++) {
        if (!FIELD_NAME_REGEXP.test(fields[j])) {
          throw new TypeError("field argument contains an invalid header name");
        }
      }
      if (header === "*") {
        return header;
      }
      var val = header;
      var vals = parse(header.toLowerCase());
      if (fields.indexOf("*") !== -1 || vals.indexOf("*") !== -1) {
        return "*";
      }
      for (var i = 0; i < fields.length; i++) {
        var fld = fields[i].toLowerCase();
        if (vals.indexOf(fld) === -1) {
          vals.push(fld);
          val = val ? val + ", " + fields[i] : fields[i];
        }
      }
      return val;
    }
    function parse(header) {
      var end = 0;
      var list = [];
      var start2 = 0;
      for (var i = 0, len = header.length; i < len; i++) {
        switch (header.charCodeAt(i)) {
          case 32:
            if (start2 === end) {
              start2 = end = i + 1;
            }
            break;
          case 44:
            list.push(header.substring(start2, end));
            start2 = end = i + 1;
            break;
          default:
            end = i + 1;
            break;
        }
      }
      list.push(header.substring(start2, end));
      return list;
    }
    function vary(res, field) {
      if (!res || !res.getHeader || !res.setHeader) {
        throw new TypeError("res argument is required");
      }
      var val = res.getHeader("Vary") || "";
      var header = Array.isArray(val) ? val.join(", ") : String(val);
      if (val = append(header, field)) {
        res.setHeader("Vary", val);
      }
    }
  }
});

// node_modules/compression/index.js
var require_compression = __commonJS({
  "node_modules/compression/index.js"(exports2, module2) {
    "use strict";
    var Negotiator = require_negotiator();
    var Buffer2 = require_safe_buffer().Buffer;
    var bytes = require_bytes();
    var compressible = require_compressible();
    var debug = require_src()("compression");
    var onHeaders = require_on_headers();
    var vary = require_vary();
    var zlib = require("zlib");
    module2.exports = compression2;
    module2.exports.filter = shouldCompress;
    var hasBrotliSupport = "createBrotliCompress" in zlib;
    var cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/;
    var SUPPORTED_ENCODING = hasBrotliSupport ? ["br", "gzip", "deflate", "identity"] : ["gzip", "deflate", "identity"];
    var PREFERRED_ENCODING = hasBrotliSupport ? ["br", "gzip"] : ["gzip"];
    var encodingSupported = ["gzip", "deflate", "identity", "br"];
    function compression2(options) {
      var opts = options || {};
      var optsBrotli = {};
      if (hasBrotliSupport) {
        Object.assign(optsBrotli, opts.brotli);
        var brotliParams = {};
        brotliParams[zlib.constants.BROTLI_PARAM_QUALITY] = 4;
        optsBrotli.params = Object.assign(brotliParams, optsBrotli.params);
      }
      var filter = opts.filter || shouldCompress;
      var threshold = bytes.parse(opts.threshold);
      var enforceEncoding = opts.enforceEncoding || "identity";
      if (threshold == null) {
        threshold = 1024;
      }
      return function compression3(req, res, next) {
        var ended = false;
        var length;
        var listeners = [];
        var stream;
        var _end = res.end;
        var _on = res.on;
        var _write = res.write;
        res.flush = function flush() {
          if (stream) {
            stream.flush();
          }
        };
        res.write = function write(chunk, encoding) {
          if (ended) {
            return false;
          }
          if (!headersSent(res)) {
            this.writeHead(this.statusCode);
          }
          return stream ? stream.write(toBuffer(chunk, encoding)) : _write.call(this, chunk, encoding);
        };
        res.end = function end(chunk, encoding) {
          if (ended) {
            return false;
          }
          if (!headersSent(res)) {
            if (!this.getHeader("Content-Length")) {
              length = chunkLength(chunk, encoding);
            }
            this.writeHead(this.statusCode);
          }
          if (!stream) {
            return _end.call(this, chunk, encoding);
          }
          ended = true;
          return chunk ? stream.end(toBuffer(chunk, encoding)) : stream.end();
        };
        res.on = function on(type, listener) {
          if (!listeners || type !== "drain") {
            return _on.call(this, type, listener);
          }
          if (stream) {
            return stream.on(type, listener);
          }
          listeners.push([type, listener]);
          return this;
        };
        function nocompress(msg) {
          debug("no compression: %s", msg);
          addListeners(res, _on, listeners);
          listeners = null;
        }
        onHeaders(res, function onResponseHeaders() {
          if (!filter(req, res)) {
            nocompress("filtered");
            return;
          }
          if (!shouldTransform(req, res)) {
            nocompress("no transform");
            return;
          }
          vary(res, "Accept-Encoding");
          if (Number(res.getHeader("Content-Length")) < threshold || length < threshold) {
            nocompress("size below threshold");
            return;
          }
          var encoding = res.getHeader("Content-Encoding") || "identity";
          if (encoding !== "identity") {
            nocompress("already encoded");
            return;
          }
          if (req.method === "HEAD") {
            nocompress("HEAD request");
            return;
          }
          var negotiator = new Negotiator(req);
          var method = negotiator.encoding(SUPPORTED_ENCODING, PREFERRED_ENCODING);
          if (!req.headers["accept-encoding"] && encodingSupported.indexOf(enforceEncoding) !== -1) {
            method = enforceEncoding;
          }
          if (!method || method === "identity") {
            nocompress("not acceptable");
            return;
          }
          debug("%s compression", method);
          stream = method === "gzip" ? zlib.createGzip(opts) : method === "br" ? zlib.createBrotliCompress(optsBrotli) : zlib.createDeflate(opts);
          addListeners(stream, stream.on, listeners);
          res.setHeader("Content-Encoding", method);
          res.removeHeader("Content-Length");
          stream.on("data", function onStreamData(chunk) {
            if (_write.call(res, chunk) === false) {
              stream.pause();
            }
          });
          stream.on("end", function onStreamEnd() {
            _end.call(res);
          });
          _on.call(res, "drain", function onResponseDrain() {
            stream.resume();
          });
        });
        next();
      };
    }
    function addListeners(stream, on, listeners) {
      for (var i = 0; i < listeners.length; i++) {
        on.apply(stream, listeners[i]);
      }
    }
    function chunkLength(chunk, encoding) {
      if (!chunk) {
        return 0;
      }
      return Buffer2.isBuffer(chunk) ? chunk.length : Buffer2.byteLength(chunk, encoding);
    }
    function shouldCompress(req, res) {
      var type = res.getHeader("Content-Type");
      if (type === void 0 || !compressible(type)) {
        debug("%s not compressible", type);
        return false;
      }
      return true;
    }
    function shouldTransform(req, res) {
      var cacheControl = res.getHeader("Cache-Control");
      return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl);
    }
    function toBuffer(chunk, encoding) {
      return Buffer2.isBuffer(chunk) ? chunk : Buffer2.from(chunk, encoding);
    }
    function headersSent(res) {
      return typeof res.headersSent !== "boolean" ? Boolean(res._header) : res.headersSent;
    }
  }
});

// server.ts
var import_http = require("http");
var import_fs = require("fs");
var import_path = require("path");
var import_compression = __toESM(require_compression());

// src/lib/socket.ts
var import_socket = require("socket.io");
var import_jwt = require("next-auth/jwt");

// src/lib/idx-stocks.ts
var IDX_STOCKS = [
  { ticker: "AADI.JK", name: "Adaro Andalan Indonesia", sector: "Energy", listingBoard: "Utama" },
  { ticker: "AALI.JK", name: "Astra Agro Lestari", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "ABBA.JK", name: "Mahaka Media", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "ABDA.JK", name: "Asuransi Bina Dana Arta", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "ABMM.JK", name: "ABM Investama", sector: "Energy", listingBoard: "Utama" },
  { ticker: "ACES.JK", name: "Aspirasi Hidup Indonesia", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "ACRO.JK", name: "Samcro Hyosung Adilestari", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ACST.JK", name: "Acset Indonusa", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "ADCP.JK", name: "Adhi Commuter Properti", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "ADES.JK", name: "Akasha Wira International", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ADHI.JK", name: "Adhi Karya (Persero)", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "ADMF.JK", name: "Adira Dinamika Multi Finance T", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "ADMG.JK", name: "Polychem Indonesia", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "ADMR.JK", name: "Alamtri Minerals Indonesia", sector: "Energy", listingBoard: "Utama" },
  { ticker: "ADRO.JK", name: "Alamtri Resources Indonesia Tb", sector: "Energy", listingBoard: "Utama" },
  { ticker: "AEGS.JK", name: "Anugerah Spareparts Sejahtera", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "AGAR.JK", name: "Asia Sejahtera Mina", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "AGII.JK", name: "Samator Indo Gas", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "AGRO.JK", name: "Bank Raya Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "AGRS.JK", name: "Bank IBK Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "AHAP.JK", name: "Asuransi Harta Aman Pratama Tb", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "AIMS.JK", name: "Artha Mahiya Investama", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "AISA.JK", name: "FKS Food Sejahtera", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "AKKU.JK", name: "Anugerah Kagum Karya Utama", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "AKPI.JK", name: "Argha Karya Prima Industry", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "AKRA.JK", name: "AKR Corporindo", sector: "Energy", listingBoard: "Utama" },
  { ticker: "AKSI.JK", name: "Mineral Sumberdaya Mandiri", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "ALDO.JK", name: "Alkindo Naratama", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "ALII.JK", name: "Ancara Logistics Indonesia", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "ALKA.JK", name: "Alakasa Industrindo", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "ALMI.JK", name: "Alumindo Light Metal Industry", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "ALTO.JK", name: "Tri Banyan Tirta", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "AMAG.JK", name: "Asuransi Multi Artha Guna", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "AMAN.JK", name: "Makmur Berkah Amanda", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "AMAR.JK", name: "Bank Amar Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "AMFG.JK", name: "Asahimas Flat Glass", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "AMIN.JK", name: "Ateliers Mecaniques D Indonesi", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "AMMN.JK", name: "Amman Mineral Internasional Tb", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "AMMS.JK", name: "Agung Menjangan Mas", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "AMOR.JK", name: "Ashmore Asset Management Indon", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "AMRT.JK", name: "Sumber Alfaria Trijaya", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "ANDI.JK", name: "Andira Agro", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "ANJT.JK", name: "Austindo Nusantara Jaya", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ANTM.JK", name: "Aneka Tambang", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "APEX.JK", name: "Apexindo Pratama Duta", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "APIC.JK", name: "Pacific Strategic Financial Tb", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "APII.JK", name: "Arita Prima Indonesia", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "APLI.JK", name: "Asiaplast Industries", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "APLN.JK", name: "Agung Podomoro Land", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "ARCI.JK", name: "Archi Indonesia", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "AREA.JK", name: "Dunia Virtual Online", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "ARGO.JK", name: "Argo Pantes", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ARII.JK", name: "Atlas Resources", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "ARKA.JK", name: "Arkha Jayanti Persada", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "ARKO.JK", name: "Arkora Hydro", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "ARMY.JK", name: "Armidian Karyatama", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "ARNA.JK", name: "Arwana Citramulia", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "ARTA.JK", name: "Arthavest", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ARTI.JK", name: "Ratu Prabu Energi", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "ARTO.JK", name: "Bank Jago", sector: "Financials", listingBoard: "Utama" },
  { ticker: "ASBI.JK", name: "Asuransi Bintang", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "ASDM.JK", name: "Asuransi Dayin Mitra", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "ASGR.JK", name: "Astra Graphia", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "ASHA.JK", name: "Cilacap Samudera Fishing Indus", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ASII.JK", name: "Astra International", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "ASJT.JK", name: "Asuransi Jasa Tania", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "ASLC.JK", name: "Autopedia Sukses Lestari", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ASLI.JK", name: "Asri Karya Lestari", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "ASMI.JK", name: "Asuransi Maximus Graha Persada", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "ASPI.JK", name: "Andalan Sakti Primaindo", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "ASPR.JK", name: "Asia Pramulia", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "ASRI.JK", name: "Alam Sutera Realty", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "ASRM.JK", name: "Asuransi Ramayana", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "ASSA.JK", name: "Adi Sarana Armada", sector: "Transportation & Logistics", listingBoard: "Utama" },
  { ticker: "ATAP.JK", name: "Trimitra Prawara Goldland", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "ATIC.JK", name: "Anabatic Technologies", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "ATLA.JK", name: "Atlantis Subsea Indonesia", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "AUTO.JK", name: "Astra Otoparts", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "AVIA.JK", name: "Avia Avian", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "AWAN.JK", name: "Era Digital Media", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "AXIO.JK", name: "Tera Data Indonusa", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "AYAM.JK", name: "Janu Putra Sejahtera", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "AYLS.JK", name: "Agro Yasa Lestari", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "BABP.JK", name: "Bank MNC Internasional", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BABY.JK", name: "Multitrend Indo", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BACA.JK", name: "Bank Capital Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BAIK.JK", name: "Bersama Mencapai Puncak", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BAJA.JK", name: "Saranacentral Bajatama", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "BALI.JK", name: "Bali Towerindo Sentra", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "BANK.JK", name: "Bank Aladin Syariah", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BAPA.JK", name: "Bekasi Asri Pemula", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "BAPI.JK", name: "Bhakti Agung Propertindo", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "BATA.JK", name: "Sepatu Bata", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "BATR.JK", name: "Benteng Api Technic", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "BAUT.JK", name: "Mitra Angkasa Sejahtera", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "BAYU.JK", name: "Bayu Buana", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "BBCA.JK", name: "Bank Central Asia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BBHI.JK", name: "Allo Bank Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BBKP.JK", name: "Bank KB Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BBLD.JK", name: "Buana Finance", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BBMD.JK", name: "Bank Mestika Dharma", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BBNI.JK", name: "Bank Negara Indonesia (Persero", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BBRI.JK", name: "Bank Rakyat Indonesia (Persero", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BBRM.JK", name: "Pelayaran Nasional Bina Buana", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "BBSI.JK", name: "Krom Bank Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BBSS.JK", name: "Bumi Benowo Sukses Sejahtera T", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "BBTN.JK", name: "Bank Tabungan Negara (Persero)", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BBYB.JK", name: "Bank Neo Commerce", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BCAP.JK", name: "MNC Kapital Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BCIC.JK", name: "Bank JTrust Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BCIP.JK", name: "Bumi Citra Permai", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "BDKR.JK", name: "Berdikari Pondasi Perkasa", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "BDMN.JK", name: "Bank Danamon Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BEBS.JK", name: "Berkah Beton Sadaya", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "BEEF.JK", name: "Estika Tata Tiara", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BEER.JK", name: "Jobubu Jarum Minahasa", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BEKS.JK", name: "Bank Pembangunan Daerah Banten", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "BELI.JK", name: "Global Digital Niaga", sector: "Technology", listingBoard: "Ekonomi Baru" },
  { ticker: "BELL.JK", name: "Trisula Textile Industries", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BESS.JK", name: "Batulicin Nusantara Maritim Tb", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "BEST.JK", name: "Bekasi Fajar Industrial Estate", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "BFIN.JK", name: "BFI Finance  Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BGTG.JK", name: "Bank Ganesha", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BHAT.JK", name: "Bhakti Multi Artha", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BHIT.JK", name: "MNC Asia Holding", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "BIKA.JK", name: "Binakarya Jaya Abadi", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "BIKE.JK", name: "Sepeda Bersama Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BIMA.JK", name: "Primarindo Asia Infrastructure", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "BINA.JK", name: "Bank Ina Perdana", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BINO.JK", name: "Perma Plasindo", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "BIPI.JK", name: "Astrindo Nusantara Infrastrukt", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "BIPP.JK", name: "Bhuwanatala Indah Permai", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "BIRD.JK", name: "Blue Bird", sector: "Transportation & Logistics", listingBoard: "Utama" },
  { ticker: "BISI.JK", name: "BISI International", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "BJBR.JK", name: "Bank Pembangunan Daerah Jawa B", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BJTM.JK", name: "Bank Pembangunan Daerah Jawa T", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BKDP.JK", name: "Bukit Darmo Property", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "BKSL.JK", name: "Sentul City", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "BKSW.JK", name: "Bank QNB Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BLES.JK", name: "Superior Prima Sukses", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "BLOG.JK", name: "Trimitra Trans Persada", sector: "Transportation & Logistics", listingBoard: "Utama" },
  { ticker: "BLTA.JK", name: "Berlian Laju Tanker", sector: "Transportation & Logistics", listingBoard: "Pemantauan Khusus" },
  { ticker: "BLTZ.JK", name: "Graha Layar Prima", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "BLUE.JK", name: "Berkah Prima Perkasa", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "BMAS.JK", name: "Bank Maspion Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BMBL.JK", name: "Lavender Bina Cendikia", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "BMHS.JK", name: "Bundamedik", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "BMRI.JK", name: "Bank Mandiri (Persero)", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BMSR.JK", name: "Bintang Mitra Semestaraya", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "BMTR.JK", name: "Global Mediacom", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "BNBA.JK", name: "Bank Bumi Arta", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BNBR.JK", name: "Bakrie & Brothers", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "BNGA.JK", name: "Bank CIMB Niaga", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BNII.JK", name: "Bank Maybank Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BNLI.JK", name: "Bank Permata", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BOAT.JK", name: "Newport Marine Services", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "BOBA.JK", name: "Formosa Ingredient Factory", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BOGA.JK", name: "Bintang Oto Global", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BOLA.JK", name: "Bali Bintang Sejahtera", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "BOLT.JK", name: "Garuda Metalindo", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BOSS.JK", name: "Borneo Olah Sarana Sukses", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "BPFI.JK", name: "Woori Finance Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BPII.JK", name: "Batavia Prosperindo Internasio", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "BPTR.JK", name: "Batavia Prosperindo Trans", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "BRAM.JK", name: "Indo Kordsa", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BREN.JK", name: "Barito Renewables Energy", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "BRIS.JK", name: "Bank Syariah Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BRMS.JK", name: "Bumi Resources Minerals", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "BRNA.JK", name: "Berlina", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "BRPT.JK", name: "Barito Pacific", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "BRRC.JK", name: "Raja Roti Cemerlang", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BSBK.JK", name: "Wulandari Bangun Laksana", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "BSDE.JK", name: "Bumi Serpong Damai", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "BSIM.JK", name: "Bank Sinarmas", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BSML.JK", name: "Bintang Samudera Mandiri Lines", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "BSSR.JK", name: "Baramulti Suksessarana", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "BSWD.JK", name: "Bank Of India Indonesia", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "BTEK.JK", name: "Bumi Teknokultura Unggul", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "BTEL.JK", name: "Bakrie Telecom", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "BTON.JK", name: "Betonjaya Manunggal", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "BTPN.JK", name: "Bank SMBC Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BTPS.JK", name: "Bank BTPN Syariah", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BUAH.JK", name: "Segar Kumala Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BUDI.JK", name: "Budi Starch & Sweetener", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "BUKA.JK", name: "Bukalapak.com", sector: "Technology", listingBoard: "Ekonomi Baru" },
  { ticker: "BUKK.JK", name: "Bukaka Teknik Utama", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "BULL.JK", name: "Buana Lintas Lautan", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "BUMI.JK", name: "Bumi Resources", sector: "Energy", listingBoard: "Utama" },
  { ticker: "BUVA.JK", name: "Bukit Uluwatu Villa", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "BVIC.JK", name: "Bank Victoria International Tb", sector: "Financials", listingBoard: "Utama" },
  { ticker: "BWPT.JK", name: "Eagle High Plantations", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "BYAN.JK", name: "Bayan Resources", sector: "Energy", listingBoard: "Utama" },
  { ticker: "CAKK.JK", name: "Cahayaputra Asa Keramik", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "CAMP.JK", name: "Campina Ice Cream Industry", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CANI.JK", name: "Capitol Nusantara Indonesia Tb", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "CARE.JK", name: "Metro Healthcare Indonesia", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "CARS.JK", name: "Industri dan Perdagangan Bintr", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "CASA.JK", name: "Capital Financial Indonesia Tb", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "CASH.JK", name: "Cashlez Worldwide Indonesia Tb", sector: "Technology", listingBoard: "Akselerasi" },
  { ticker: "CASS.JK", name: "Cahaya Aero Services", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "CBDK.JK", name: "Bangun Kosambi Sukses", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "CBMF.JK", name: "Cahaya Bintang Medan", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "CBPE.JK", name: "Citra Buana Prasida", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "CBRE.JK", name: "Cakra Buana Resources Energi T", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "CBUT.JK", name: "Citra Borneo Utama", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CCSI.JK", name: "Communication Cable Systems In", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "CDIA.JK", name: "Chandra Daya Investasi", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "CEKA.JK", name: "Wilmar Cahaya Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CENT.JK", name: "Centratama Telekomunikasi Indo", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "CFIN.JK", name: "Clipan Finance Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "CGAS.JK", name: "Citra Nusantara Gemilang", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "CHEK.JK", name: "Diastika Biotekindo", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "CHEM.JK", name: "Chemstar Indonesia", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "CHIP.JK", name: "Pelita Teknologi Global", sector: "Technology", listingBoard: "Akselerasi" },
  { ticker: "CINT.JK", name: "Chitose Internasional", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CITA.JK", name: "Cita Mineral Investindo", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "CITY.JK", name: "Natura City Developments", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "CLAY.JK", name: "Citra Putra Realty", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CLEO.JK", name: "Sariguna Primatirta", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "CLPI.JK", name: "Colorpak Indonesia", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "CMNP.JK", name: "Citra Marga Nusaphala Persada", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "CMNT.JK", name: "Cemindo Gemilang", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "CMPP.JK", name: "AirAsia Indonesia", sector: "Transportation & Logistics", listingBoard: "Pemantauan Khusus" },
  { ticker: "CMRY.JK", name: "Cisarua Mountain Dairy", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "CNKO.JK", name: "Exploitasi Energi Indonesia Tb", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "CNMA.JK", name: "Nusantara Sejahtera Raya", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CNTX.JK", name: "Century Textile Industry", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "COAL.JK", name: "Black Diamond Resources", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "COCO.JK", name: "Wahana Interfood Nusantara", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "COIN.JK", name: "Indokripto Koin Semesta", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "COWL.JK", name: "Cowell Development", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "CPIN.JK", name: "Charoen Pokphand Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "CPRI.JK", name: "Capri Nusa Satu Properti", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "CPRO.JK", name: "Central Proteina Prima", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CRAB.JK", name: "Toba Surimi Industries", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CRSN.JK", name: "Carsurin", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "CSAP.JK", name: "Catur Sentosa Adiprana", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CSIS.JK", name: "Cahayasakti Investindo Sukses", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "CSMI.JK", name: "Cipta Selera Murni", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "CSRA.JK", name: "Cisadane Sawit Raya", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "CTBN.JK", name: "Citra Tubindo", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "CTRA.JK", name: "Ciputra Development", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "CTTH.JK", name: "Citatah", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "CUAN.JK", name: "Petrindo Jaya Kreasi", sector: "Energy", listingBoard: "Utama" },
  { ticker: "CYBR.JK", name: "ITSEC Asia", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "DAAZ.JK", name: "Daaz Bara Lestari", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "DADA.JK", name: "Diamond Citra Propertindo", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "DART.JK", name: "Duta Anggada Realty", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "DATA.JK", name: "Remala Abadi", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "DAYA.JK", name: "Duta Intidaya", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DCII.JK", name: "DCI Indonesia", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "DEAL.JK", name: "Dewata Freightinternational Tb", sector: "Transportation & Logistics", listingBoard: "Pemantauan Khusus" },
  { ticker: "DEFI.JK", name: "Danasupra Erapacific", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "DEPO.JK", name: "Caturkarda Depo Bangunan", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DEWA.JK", name: "Darma Henwa", sector: "Energy", listingBoard: "Utama" },
  { ticker: "DEWI.JK", name: "Dewi Shri Farmindo", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DFAM.JK", name: "Dafam Property Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DGIK.JK", name: "Nusa Konstruksi Enjiniring", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "DGNS.JK", name: "Diagnos Laboratorium Utama", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "DGWG.JK", name: "Delta Giri Wacana", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "DIGI.JK", name: "Arkadia Digital Media", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "DILD.JK", name: "Intiland Development", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "DIVA.JK", name: "Distribusi Voucher Nusantara T", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "DKFT.JK", name: "Central Omega Resources", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "DKHH.JK", name: "Cipta Sarana Medika", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "DLTA.JK", name: "Delta Djakarta", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "DMAS.JK", name: "Puradelta Lestari", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "DMMX.JK", name: "Digital Mediatama Maxima", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "DMND.JK", name: "Diamond Food Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DNAR.JK", name: "Bank Oke Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "DNET.JK", name: "Indoritel Makmur Internasional", sector: "Financials", listingBoard: "Utama" },
  { ticker: "DOID.JK", name: "BUMA Internasional Grup", sector: "Energy", listingBoard: "Utama" },
  { ticker: "DOOH.JK", name: "Era Media Sejahtera", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DOSS.JK", name: "Global Sukses Digital", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DPNS.JK", name: "Duta Pertiwi Nusantara", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "DPUM.JK", name: "Dua Putra Utama Makmur", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DRMA.JK", name: "Dharma Polimetal", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "DSFI.JK", name: "Dharma Samudera Fishing Indust", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "DSNG.JK", name: "Dharma Satya Nusantara", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "DSSA.JK", name: "Dian Swastatika Sentosa", sector: "Energy", listingBoard: "Utama" },
  { ticker: "DUCK.JK", name: "Jaya Bersama Indo", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "DUTI.JK", name: "Duta Pertiwi", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "DVLA.JK", name: "Darya-Varia Laboratoria", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "DWGL.JK", name: "Dwi Guna Laksana", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "DYAN.JK", name: "Dyandra Media International Tb", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "EAST.JK", name: "Eastparc Hotel", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ECII.JK", name: "Electronic City Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "EDGE.JK", name: "Indointernet", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "EKAD.JK", name: "Ekadharma International", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "ELIT.JK", name: "Data Sinergitama Jaya", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "ELPI.JK", name: "Pelayaran Nasional Ekalya Purn", sector: "Transportation & Logistics", listingBoard: "Utama" },
  { ticker: "ELSA.JK", name: "Elnusa", sector: "Energy", listingBoard: "Utama" },
  { ticker: "ELTY.JK", name: "Bakrieland Development", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "EMAS.JK", name: "Merdeka Gold Resources", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "EMDE.JK", name: "Megapolitan Developments", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "EMTK.JK", name: "Elang Mahkota Teknologi", sector: "Technology", listingBoard: "Utama" },
  { ticker: "ENAK.JK", name: "Champ Resto Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ENRG.JK", name: "Energi Mega Persada", sector: "Energy", listingBoard: "Utama" },
  { ticker: "ENVY.JK", name: "Envy Technologies Indonesia Tb", sector: "Technology", listingBoard: "Pemantauan Khusus" },
  { ticker: "ENZO.JK", name: "Morenzo Abadi Perkasa", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "EPAC.JK", name: "Megalestari Epack Sentosaraya", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "EPMT.JK", name: "Enseval Putera Megatrading", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ERAA.JK", name: "Erajaya Swasembada", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "ERAL.JK", name: "Sinar Eka Selaras", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "ERTX.JK", name: "Eratex Djaja", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ESIP.JK", name: "Sinergi Inti Plastindo", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "ESSA.JK", name: "ESSA Industries Indonesia", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "ESTA.JK", name: "Esta Multi Usaha", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ESTI.JK", name: "Ever Shine Tex", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ETWA.JK", name: "Eterindo Wahanatama", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "EURO.JK", name: "Estee Gold Feet", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "EXCL.JK", name: "XLSMART Telecom Sejahtera", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "FAPA.JK", name: "FAP Agri", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "FAST.JK", name: "Fast Food Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "FASW.JK", name: "Fajar Surya Wisesa", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "FILM.JK", name: "MD Entertainment", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "FIMP.JK", name: "Fimperkasa Utama", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "FIRE.JK", name: "Alfa Energi Investama", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "FISH.JK", name: "FKS Multi Agro", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "FITT.JK", name: "Hotel Fitra International", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "FLMC.JK", name: "Falmaco Nonwoven Industri", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "FMII.JK", name: "Fortune Mate Indonesia", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "FOLK.JK", name: "Multi Garam Utama", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "FOOD.JK", name: "Sentra Food Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "FORE.JK", name: "Fore Kopi Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "FORU.JK", name: "Fortune Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "FPNI.JK", name: "Lotte Chemical Titan", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "FUJI.JK", name: "Fuji Finance Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "FUTR.JK", name: "Futura Energi Global", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "FWCT.JK", name: "Wijaya Cahaya Timber", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "GAMA.JK", name: "Aksara Global Development", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "GDST.JK", name: "Gunawan Dianjaya Steel", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "GDYR.JK", name: "Goodyear Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "GEMA.JK", name: "Gema Grahasarana", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "GEMS.JK", name: "Golden Energy Mines", sector: "Energy", listingBoard: "Utama" },
  { ticker: "GGRM.JK", name: "Gudang Garam", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "GGRP.JK", name: "Gunung Raja Paksi", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "GHON.JK", name: "Gihon Telekomunikasi Indonesia", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "GIAA.JK", name: "Garuda Indonesia (Persero)", sector: "Transportation & Logistics", listingBoard: "Pemantauan Khusus" },
  { ticker: "GJTL.JK", name: "Gajah Tunggal", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "GLOB.JK", name: "Globe Kita Terang", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "GLVA.JK", name: "Galva Technologies", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "GMFI.JK", name: "Garuda Maintenance Facility Ae", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "GMTD.JK", name: "Gowa Makassar Tourism Developm", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "GOLD.JK", name: "Visi Telekomunikasi Infrastruk", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "GOLF.JK", name: "Intra Golflink Resorts", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "GOLL.JK", name: "Golden Plantation", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "GOOD.JK", name: "Garudafood Putra Putri Jaya Tb", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "GOTO.JK", name: "GoTo Gojek Tokopedia", sector: "Technology", listingBoard: "Ekonomi Baru" },
  { ticker: "GPRA.JK", name: "Perdana Gapuraprima", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "GPSO.JK", name: "Geoprima Solusi", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "GRIA.JK", name: "Ingria Pratama Capitalindo", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "GRPH.JK", name: "Griptha Putra Persada", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "GRPM.JK", name: "Graha Prima Mentari", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "GSMF.JK", name: "Equity Development Investment", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "GTBO.JK", name: "Garda Tujuh Buana", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "GTRA.JK", name: "Grahaprima Suksesmandiri", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "GTSI.JK", name: "GTS Internasional", sector: "Energy", listingBoard: "Utama" },
  { ticker: "GULA.JK", name: "Aman Agrindo", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "GUNA.JK", name: "Gunanusa Eramandiri", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "GWSA.JK", name: "Greenwood Sejahtera", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "GZCO.JK", name: "Gozco Plantations", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "HADE.JK", name: "Himalaya Energi Perkasa", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "HAIS.JK", name: "Hasnur Internasional Shipping", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "HAJJ.JK", name: "Arsy Buana Travelindo", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "HALO.JK", name: "Haloni Jane", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "HATM.JK", name: "Habco Trans Maritima", sector: "Transportation & Logistics", listingBoard: "Utama" },
  { ticker: "HBAT.JK", name: "Minahasa Membangun Hebat", sector: "Properties & Real Estate", listingBoard: "Akselerasi" },
  { ticker: "HDFA.JK", name: "Radana Bhaskara Finance", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "HDIT.JK", name: "Hensel Davest Indonesia", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "HEAL.JK", name: "Medikaloka Hermina", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "HELI.JK", name: "Jaya Trishindo", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "HERO.JK", name: "DFI Retail Nusantara", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "HEXA.JK", name: "Hexindo Adiperkasa", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "HGII.JK", name: "Hero Global Investment", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "HILL.JK", name: "Hillcon", sector: "Energy", listingBoard: "Utama" },
  { ticker: "HITS.JK", name: "Humpuss Intermoda Transportasi", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "HKMU.JK", name: "HK Metals Utama", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "HMSP.JK", name: "H.M. Sampoerna", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "HOKI.JK", name: "Buyung Poetra Sembada", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "HOME.JK", name: "Hotel Mandarine Regency", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "HOMI.JK", name: "Grand House Mulia", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "HOPE.JK", name: "Harapan Duta Pertiwi", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "HOTL.JK", name: "Saraswati Griya Lestari", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "HRME.JK", name: "Menteng Heritage Realty", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "HRTA.JK", name: "Hartadinata Abadi", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "HRUM.JK", name: "Harum Energy", sector: "Energy", listingBoard: "Utama" },
  { ticker: "HUMI.JK", name: "Humpuss Maritim Internasional", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "HYGN.JK", name: "Ecocare Indo Pasifik", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "IATA.JK", name: "MNC Energy Investments", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "IBFN.JK", name: "Intan Baru Prana", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "IBOS.JK", name: "Indo Boga Sukses", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "IBST.JK", name: "Inti Bangun Sejahtera", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "ICBP.JK", name: "Indofood CBP Sukses Makmur", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "ICON.JK", name: "Island Concepts Indonesia", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "IDEA.JK", name: "Idea Indonesia Akademi", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "IDPR.JK", name: "Indonesia Pondasi Raya", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "IFII.JK", name: "Indonesia Fibreboard Industry", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "IFSH.JK", name: "Ifishdeco", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "IGAR.JK", name: "Champion Pacific Indonesia", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "IIKP.JK", name: "Inti Agri Resources", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "IKAI.JK", name: "Intikeramik Alamasri Industri", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "IKAN.JK", name: "Era Mandiri Cemerlang", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "IKBI.JK", name: "Sumi Indo Kabel", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "IKPM.JK", name: "Ikapharmindo Putramas", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "IMAS.JK", name: "Indomobil Sukses Internasional", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "IMJS.JK", name: "Indomobil Multi Jasa", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "IMPC.JK", name: "Impack Pratama Industri", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "INAF.JK", name: "Indofarma", sector: "Healthcare", listingBoard: "Pemantauan Khusus" },
  { ticker: "INAI.JK", name: "Indal Aluminium Industry", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "INCF.JK", name: "Indo Komoditi Korpora", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "INCI.JK", name: "Intanwijaya Internasional", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "INCO.JK", name: "Vale Indonesia", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "INDF.JK", name: "Indofood Sukses Makmur", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "INDO.JK", name: "Royalindo Investa Wijaya", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "INDR.JK", name: "Indo-Rama Synthetics", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "INDS.JK", name: "Indospring", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "INDX.JK", name: "Tanah Laut", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "INDY.JK", name: "Indika Energy", sector: "Energy", listingBoard: "Utama" },
  { ticker: "INET.JK", name: "Sinergi Inti Andalan Prima", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "INKP.JK", name: "Indah Kiat Pulp & Paper", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "INOV.JK", name: "Inocycle Technology Group", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "INPC.JK", name: "Bank Artha Graha Internasional", sector: "Financials", listingBoard: "Utama" },
  { ticker: "INPP.JK", name: "Indonesian Paradise Property T", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "INPS.JK", name: "Indah Prakasa Sentosa", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "INRU.JK", name: "Toba Pulp Lestari", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "INTA.JK", name: "Intraco Penta", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "INTD.JK", name: "Inter Delta", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "INTP.JK", name: "Indocement Tunggal Prakarsa Tb", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "IOTF.JK", name: "Sumber Sinergi Makmur", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "IPAC.JK", name: "Era Graharealty", sector: "Properties & Real Estate", listingBoard: "Akselerasi" },
  { ticker: "IPCC.JK", name: "Indonesia Kendaraan Terminal T", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "IPCM.JK", name: "Jasa Armada Indonesia", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "IPOL.JK", name: "Indopoly Swakarsa Industry", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "IPPE.JK", name: "Indo Pureco Pratama", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "IPTV.JK", name: "MNC Vision Networks", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "IRRA.JK", name: "Itama Ranoraya", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "IRSX.JK", name: "Folago Global Nusantara", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "ISAP.JK", name: "Isra Presisi Indonesia", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "ISAT.JK", name: "Indosat", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "ISEA.JK", name: "Indo American Seafoods", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ISSP.JK", name: "Steel Pipe Industry of Indones", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "ITIC.JK", name: "Indonesian Tobacco", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ITMA.JK", name: "Sumber Energi Andalan", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "ITMG.JK", name: "Indo Tambangraya Megah", sector: "Energy", listingBoard: "Utama" },
  { ticker: "JARR.JK", name: "Jhonlin Agro Raya", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "JAST.JK", name: "Jasnita Telekomindo", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "JATI.JK", name: "Informasi Teknologi Indonesia", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "JAWA.JK", name: "Jaya Agra Wattie", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "JAYA.JK", name: "Armada Berjaya Trans", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "JECC.JK", name: "Jembo Cable Company", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "JGLE.JK", name: "Graha Andrasentra Propertindo", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "JIHD.JK", name: "Jakarta International Hotels &", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "JKON.JK", name: "Jaya Konstruksi Manggala Prata", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "JMAS.JK", name: "Asuransi Jiwa Syariah Jasa Mit", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "JPFA.JK", name: "Japfa Comfeed Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "JRPT.JK", name: "Jaya Real Property", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "JSKY.JK", name: "Sky Energy Indonesia", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "JSMR.JK", name: "Jasa Marga (Persero)", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "JSPT.JK", name: "Jakarta Setiabudi Internasiona", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "JTPE.JK", name: "Jasuindo Tiga Perkasa", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "KAEF.JK", name: "Kimia Farma", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "KAQI.JK", name: "Jantra Grupo Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "KARW.JK", name: "Meratus Jasa Prima", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "KAYU.JK", name: "Darmi Bersaudara", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "KBAG.JK", name: "Karya Bersama Anugerah", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "KBLI.JK", name: "KMI Wire & Cable", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "KBLM.JK", name: "Kabelindo Murni", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "KBLV.JK", name: "First Media", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "KBRI.JK", name: "Kertas Basuki Rachmat Indonesi", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "KDSI.JK", name: "Kedawung Setia Industrial", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "KDTN.JK", name: "Puri Sentul Permai", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "KEEN.JK", name: "Kencana Energi Lestari", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "KEJU.JK", name: "Mulia Boga Raya", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "KETR.JK", name: "Ketrosden Triasmitra", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "KIAS.JK", name: "Keramika Indonesia Assosiasi T", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "KICI.JK", name: "Kedaung Indah Can", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "KIJA.JK", name: "Kawasan Industri Jababeka", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "KING.JK", name: "Hoffmen Cleanindo", sector: "Industrials", listingBoard: "Akselerasi" },
  { ticker: "KINO.JK", name: "Kino Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "KIOS.JK", name: "Kioson Komersial Indonesia", sector: "Technology", listingBoard: "Pemantauan Khusus" },
  { ticker: "KJEN.JK", name: "Krida Jaringan Nusantara", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "KKES.JK", name: "Kusuma Kemindo Sentosa", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "KKGI.JK", name: "Resource Alam Indonesia", sector: "Energy", listingBoard: "Utama" },
  { ticker: "KLAS.JK", name: "Pelayaran Kurnia Lautan Semest", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "KLBF.JK", name: "Kalbe Farma", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "KLIN.JK", name: "Klinko Karya Imaji", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "KMDS.JK", name: "Kurniamitra Duta Sentosa", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "KMTR.JK", name: "Kirana Megatara", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "KOBX.JK", name: "Kobexindo Tractors", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "KOCI.JK", name: "Kokoh Exa Nusantara", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "KOIN.JK", name: "Kokoh Inti Arebama", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "KOKA.JK", name: "Koka Indonesia", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "KONI.JK", name: "Perdana Bangun Pusaka", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "KOPI.JK", name: "Mitra Energi Persada", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "KOTA.JK", name: "DMS Propertindo", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "KPIG.JK", name: "MNC Tourism Indonesia", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "KRAS.JK", name: "Krakatau Steel (Persero)", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "KREN.JK", name: "Quantum Clovera Investama", sector: "Technology", listingBoard: "Pemantauan Khusus" },
  { ticker: "KRYA.JK", name: "Bangun Karya Perkasa Jaya", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "KSIX.JK", name: "Kentanix Supra International T", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "KUAS.JK", name: "Ace Oldfields", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "LABA.JK", name: "Green Power Group", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "LABS.JK", name: "UBC Medical Indonesia", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "LAJU.JK", name: "Jasa Berdikari Logistics", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "LAND.JK", name: "Trimitra Propertindo", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "LAPD.JK", name: "Leyand International", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "LCGP.JK", name: "Eureka Prima Jakarta", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "LCKM.JK", name: "LCK Global Kedaton", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "LEAD.JK", name: "Logindo Samudramakmur", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "LFLO.JK", name: "Imago Mulia Persada", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "LIFE.JK", name: "MSIG Life Insurance Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "LINK.JK", name: "Link Net", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "LION.JK", name: "Lion Metal Works", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "LIVE.JK", name: "Homeco Victoria Makmur", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "LMAS.JK", name: "Limas Indonesia Makmur", sector: "Technology", listingBoard: "Pemantauan Khusus" },
  { ticker: "LMAX.JK", name: "Lupromax Pelumas Indonesia", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "LMPI.JK", name: "Langgeng Makmur Industri", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "LMSH.JK", name: "Lionmesh Prima", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "LOPI.JK", name: "Logisticsplus International Tb", sector: "Transportation & Logistics", listingBoard: "Akselerasi" },
  { ticker: "LPCK.JK", name: "Lippo Cikarang", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "LPGI.JK", name: "Lippo General Insurance", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "LPIN.JK", name: "Multi Prima Sejahtera", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "LPKR.JK", name: "Lippo Karawaci", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "LPLI.JK", name: "Star Pacific", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "LPPF.JK", name: "Matahari Department Store", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "LPPS.JK", name: "Lenox Pasifik Investama", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "LRNA.JK", name: "Eka Sari Lorena Transport", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "LSIP.JK", name: "PP London Sumatra Indonesia Tb", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "LTLS.JK", name: "Lautan Luas", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "LUCK.JK", name: "Sentral Mitra Informatika", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "LUCY.JK", name: "Lima Dua Lima Tiga", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "MABA.JK", name: "Marga Abhinaya Abadi", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "MAGP.JK", name: "Multi Agro Gemilang Plantation", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "MAHA.JK", name: "Mandiri Herindo Adiperkasa", sector: "Energy", listingBoard: "Utama" },
  { ticker: "MAIN.JK", name: "Malindo Feedmill", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "MANG.JK", name: "Manggung Polahraya", sector: "Infrastructures", listingBoard: "Akselerasi" },
  { ticker: "MAPA.JK", name: "Map Aktif Adiperkasa", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "MAPB.JK", name: "MAP Boga Adiperkasa", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MAPI.JK", name: "Mitra Adiperkasa", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "MARI.JK", name: "Mahaka Radio Integra", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "MARK.JK", name: "Mark Dynamics Indonesia", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "MASB.JK", name: "Bank Multiarta Sentosa", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "MAXI.JK", name: "Maxindo Karya Anugerah", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MAYA.JK", name: "Bank Mayapada Internasional Tb", sector: "Financials", listingBoard: "Utama" },
  { ticker: "MBAP.JK", name: "Mitrabara Adiperdana", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "MBMA.JK", name: "Merdeka Battery Materials", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "MBSS.JK", name: "Mitrabahtera Segara Sejati", sector: "Energy", listingBoard: "Utama" },
  { ticker: "MBTO.JK", name: "Martina Berto", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MCAS.JK", name: "M Cash Integrasi", sector: "Technology", listingBoard: "Utama" },
  { ticker: "MCOL.JK", name: "Prima Andalan Mandiri", sector: "Energy", listingBoard: "Utama" },
  { ticker: "MCOR.JK", name: "Bank China Construction Bank I", sector: "Financials", listingBoard: "Utama" },
  { ticker: "MDIA.JK", name: "Intermedia Capital", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "MDIY.JK", name: "Daya Intiguna Yasa", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "MDKA.JK", name: "Merdeka Copper Gold", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "MDKI.JK", name: "Emdeki Utama", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "MDLA.JK", name: "Medela Potentia", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "MDLN.JK", name: "Modernland Realty", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "MDRN.JK", name: "Modern Internasional", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "MEDC.JK", name: "Medco Energi Internasional", sector: "Energy", listingBoard: "Utama" },
  { ticker: "MEDS.JK", name: "Hetzer Medical Indonesia", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "MEGA.JK", name: "Bank Mega", sector: "Financials", listingBoard: "Utama" },
  { ticker: "MEJA.JK", name: "Harta Djaya Karya", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "MENN.JK", name: "Menn Teknologi Indonesia", sector: "Technology", listingBoard: "Akselerasi" },
  { ticker: "MERI.JK", name: "Merry Riana Edukasi", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MERK.JK", name: "Merck", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "META.JK", name: "Nusantara Infrastructure", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "MFMI.JK", name: "Multifiling Mitra Indonesia Tb", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "MGLV.JK", name: "Panca Anugrah Wisesa", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "MGNA.JK", name: "Magna Investama Mandiri", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MGRO.JK", name: "Mahkota Group", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MHKI.JK", name: "Multi Hanna Kreasindo", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "MICE.JK", name: "Multi Indocitra", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MIDI.JK", name: "Midi Utama Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "MIKA.JK", name: "Mitra Keluarga Karyasehat", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "MINA.JK", name: "Sanurhasta Mitra", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MINE.JK", name: "Sinar Terang Mandiri", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "MIRA.JK", name: "Mitra International Resources", sector: "Transportation & Logistics", listingBoard: "Pemantauan Khusus" },
  { ticker: "MITI.JK", name: "Mitra Investindo", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "MKAP.JK", name: "Multikarya Asia Pasifik Raya T", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "MKNT.JK", name: "Mitra Komunikasi Nusantara", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "MKPI.JK", name: "Metropolitan Kentjana", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "MKTR.JK", name: "Menthobi Karyatama Raya", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "MLBI.JK", name: "Multi Bintang Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "MLIA.JK", name: "Mulia Industrindo", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "MLPL.JK", name: "Multipolar", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "MLPT.JK", name: "Multipolar Technology", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "MMIX.JK", name: "Multi Medika Internasional", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "MMLP.JK", name: "Mega Manunggal Property", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "MNCN.JK", name: "Media Nusantara Citra", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "MOLI.JK", name: "Madusari Murni Indah", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "MORA.JK", name: "Mora Telematika Indonesia", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "MPIX.JK", name: "Mitra Pedagang Indonesia", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "MPMX.JK", name: "Mitra Pinasthika Mustika", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "MPOW.JK", name: "Megapower Makmur", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "MPPA.JK", name: "Matahari Putra Prima", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MPRO.JK", name: "Maha Properti Indonesia", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "MPXL.JK", name: "MPX Logistics International Tb", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "MRAT.JK", name: "Mustika Ratu", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MREI.JK", name: "Maskapai Reasuransi Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "MSIE.JK", name: "Multisarana Intan Eduka", sector: "Properties & Real Estate", listingBoard: "Akselerasi" },
  { ticker: "MSIN.JK", name: "MNC Digital Entertainment", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "MSJA.JK", name: "Multi Spunindo Jaya", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MSKY.JK", name: "MNC Sky Vision", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "MSTI.JK", name: "Mastersystem Infotama", sector: "Technology", listingBoard: "Utama" },
  { ticker: "MTDL.JK", name: "Metrodata Electronics", sector: "Technology", listingBoard: "Utama" },
  { ticker: "MTEL.JK", name: "Dayamitra Telekomunikasi", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "MTFN.JK", name: "Capitalinc Investment", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "MTLA.JK", name: "Metropolitan Land", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "MTMH.JK", name: "Murni Sadar", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "MTPS.JK", name: "Meta Epsi", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "MTRA.JK", name: "Mitra Pemuda", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "MTSM.JK", name: "Metro Realty", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "MTWI.JK", name: "Malacca Trust Wuwungan Insuran", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "MUTU.JK", name: "Mutuagung Lestari", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "MYOH.JK", name: "Samindo Resources", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "MYOR.JK", name: "Mayora Indah", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "MYTX.JK", name: "Asia Pacific Investama", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "NAIK.JK", name: "Adiwarna Anugerah Abadi", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "NANO.JK", name: "Nanotech Indonesia Global", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "NASA.JK", name: "Andalan Perkasa Abadi", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "NASI.JK", name: "Wahana Inti Makmur", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "NATO.JK", name: "Surya Permata Andalan", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "NAYZ.JK", name: "Hassana Boga Sejahtera", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "NCKL.JK", name: "Trimegah Bangun Persada", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "NELY.JK", name: "Pelayaran Nelly Dwi Putri", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "NEST.JK", name: "Esta Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "NETV.JK", name: "MDTV Media Technologies", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "NFCX.JK", name: "NFC Indonesia", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "NICE.JK", name: "Adhi Kartiko Pratama", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "NICK.JK", name: "Charnic Capital", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "NICL.JK", name: "PAM Mineral", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "NIKL.JK", name: "Pelat Timah Nusantara", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "NINE.JK", name: "Techno9 Indonesia", sector: "Technology", listingBoard: "Akselerasi" },
  { ticker: "NIRO.JK", name: "City Retail Developments", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "NISP.JK", name: "Bank OCBC NISP", sector: "Financials", listingBoard: "Utama" },
  { ticker: "NOBU.JK", name: "Bank Nationalnobu", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "NPGF.JK", name: "Nusa Palapa Gemilang", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "NRCA.JK", name: "Nusa Raya Cipta", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "NSSS.JK", name: "Nusantara Sawit Sejahtera", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "NTBK.JK", name: "Nusatama Berkah", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "NUSA.JK", name: "Sinergi Megah Internusa", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "NZIA.JK", name: "Nusantara Almazia", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "OASA.JK", name: "Maharaksa Biru Energi", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "OBAT.JK", name: "Brigit Biofarmaka Teknologi Tb", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "OBMD.JK", name: "OBM Drilchem", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "OCAP.JK", name: "Onix Capital", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "OILS.JK", name: "Indo Oil Perkasa", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "OKAS.JK", name: "Ancora Indonesia Resources", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "OLIV.JK", name: "Oscar Mitra Sukses Sejahtera T", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "OMED.JK", name: "Jayamas Medica Industri", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "OMRE.JK", name: "Indonesia Prima Property", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "OPMS.JK", name: "Optima Prima Metal Sinergi", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "PACK.JK", name: "Abadi Nusantara Hijau Investam", sector: "Basic Materials", listingBoard: "Akselerasi" },
  { ticker: "PADA.JK", name: "Personel Alih Daya", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "PADI.JK", name: "Minna Padi Investama Sekuritas", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "PALM.JK", name: "Provident Investasi Bersama Tb", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "PAMG.JK", name: "Bima Sakti Pertiwi", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "PANI.JK", name: "Pantai Indah Kapuk Dua", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "PANR.JK", name: "Panorama Sentrawisata", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "PANS.JK", name: "Panin Sekuritas", sector: "Financials", listingBoard: "Utama" },
  { ticker: "PART.JK", name: "Cipta Perdana Lancar", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PBID.JK", name: "Panca Budi Idaman", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "PBRX.JK", name: "Pan Brothers", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "PBSA.JK", name: "Paramita Bangun Sarana", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "PCAR.JK", name: "Prima Cakrawala Abadi", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "PDES.JK", name: "Destinasi Tirta Nusantara", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PDPP.JK", name: "Primadaya Plastisindo", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "PEGE.JK", name: "Panca Global Kapital", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "PEHA.JK", name: "Phapros", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "PEVE.JK", name: "Penta Valent", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "PGAS.JK", name: "Perusahaan Gas Negara", sector: "Energy", listingBoard: "Utama" },
  { ticker: "PGEO.JK", name: "Pertamina Geothermal Energy Tb", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "PGJO.JK", name: "Bahtera Bumi Raya", sector: "Technology", listingBoard: "Akselerasi" },
  { ticker: "PGLI.JK", name: "Pembangunan Graha Lestari Inda", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PGUN.JK", name: "Pradiksi Gunatama", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PICO.JK", name: "Pelangi Indah Canindo", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "PIPA.JK", name: "Multi Makmur Lemindo", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "PJAA.JK", name: "Pembangunan Jaya Ancol", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PJHB.JK", name: "Pelayaran Jaya Hidup Baru", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "PKPK.JK", name: "Paragon Karya Perkasa", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "PLAN.JK", name: "Planet Properindo Jaya", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "PLAS.JK", name: "Polaris Investama", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "PLIN.JK", name: "Plaza Indonesia Realty", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "PMJS.JK", name: "Putra Mandiri Jembar", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PMMP.JK", name: "Panca Mitra Multiperdana", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "PMUI.JK", name: "Prima Multi Usaha Indonesia Tb", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PNBN.JK", name: "Bank Pan Indonesia", sector: "Financials", listingBoard: "Utama" },
  { ticker: "PNBS.JK", name: "Bank Panin Dubai Syariah", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "PNGO.JK", name: "Pinago Utama", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "PNIN.JK", name: "Paninvest", sector: "Financials", listingBoard: "Utama" },
  { ticker: "PNLF.JK", name: "Panin Financial", sector: "Financials", listingBoard: "Utama" },
  { ticker: "PNSE.JK", name: "Pudjiadi & Sons", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "POLA.JK", name: "Pool Advista Finance", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "POLI.JK", name: "Pollux Hotels Group", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "POLL.JK", name: "Pollux Properties Indonesia Tb", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "POLU.JK", name: "Golden Flower", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "POLY.JK", name: "Asia Pacific Fibers", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "POOL.JK", name: "Pool Advista Indonesia", sector: "Financials", listingBoard: "Pemantauan Khusus" },
  { ticker: "PORT.JK", name: "Nusantara Pelabuhan Handal", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "POSA.JK", name: "Bliss Properti Indonesia", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "POWR.JK", name: "Cikarang Listrindo", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "PPGL.JK", name: "Prima Globalindo Logistik", sector: "Transportation & Logistics", listingBoard: "Akselerasi" },
  { ticker: "PPRE.JK", name: "PP Presisi", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "PPRI.JK", name: "Paperocks Indonesia", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "PPRO.JK", name: "PP Properti", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "PRAY.JK", name: "Famon Awal Bros Sedaya", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "PRDA.JK", name: "Prodia Widyahusada", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "PRIM.JK", name: "Royal Prima", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "PSAB.JK", name: "J Resources Asia Pasifik", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "PSAT.JK", name: "Pancaran Samudera Transport Tb", sector: "Energy", listingBoard: "Utama" },
  { ticker: "PSDN.JK", name: "Prasidha Aneka Niaga", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PSGO.JK", name: "Palma Serasih", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "PSKT.JK", name: "Red Planet Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PSSI.JK", name: "IMC Pelita Logistik", sector: "Energy", listingBoard: "Utama" },
  { ticker: "PTBA.JK", name: "Bukit Asam", sector: "Energy", listingBoard: "Utama" },
  { ticker: "PTDU.JK", name: "Djasa Ubersakti", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "PTIS.JK", name: "Indo Straits", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "PTMP.JK", name: "Mitra Pack", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "PTMR.JK", name: "Master Print", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "PTPP.JK", name: "PP (Persero)", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "PTPS.JK", name: "Pulau Subur", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PTPW.JK", name: "Pratama Widya", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "PTRO.JK", name: "Petrosea", sector: "Energy", listingBoard: "Utama" },
  { ticker: "PTSN.JK", name: "Sat Nusapersada", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "PTSP.JK", name: "Pioneerindo Gourmet Internatio", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "PUDP.JK", name: "Pudjiadi Prestige", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "PURA.JK", name: "Putra Rajawali Kencana", sector: "Transportation & Logistics", listingBoard: "Pemantauan Khusus" },
  { ticker: "PURE.JK", name: "Trinitan Metals and Minerals T", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "PURI.JK", name: "Puri Global Sukses", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "PWON.JK", name: "Pakuwon Jati", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "PYFA.JK", name: "Pyridam Farma", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "PZZA.JK", name: "Sarimelati Kencana", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "RAAM.JK", name: "Tripar Multivision Plus", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "RAFI.JK", name: "Sari Kreasi Boga", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "RAJA.JK", name: "Rukun Raharja", sector: "Energy", listingBoard: "Utama" },
  { ticker: "RALS.JK", name: "Ramayana Lestari Sentosa", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "RANC.JK", name: "Supra Boga Lestari", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "RATU.JK", name: "Raharja Energi Cepu", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "RBMS.JK", name: "Ristia Bintang Mahkotasejati T", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "RCCC.JK", name: "Utama Radar Cahaya", sector: "Transportation & Logistics", listingBoard: "Akselerasi" },
  { ticker: "RDTX.JK", name: "Roda Vivatex", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "REAL.JK", name: "Repower Asia Indonesia", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "RELF.JK", name: "Graha Mitra Asia", sector: "Properties & Real Estate", listingBoard: "Akselerasi" },
  { ticker: "RELI.JK", name: "Reliance Sekuritas Indonesia T", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "RGAS.JK", name: "Kian Santang Muliatama", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "RICY.JK", name: "Ricky Putra Globalindo", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "RIGS.JK", name: "Rig Tenders Indonesia", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "RIMO.JK", name: "Rimo International Lestari", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "RISE.JK", name: "Jaya Sukses Makmur Sentosa", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "RLCO.JK", name: "Abadi Lestari Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "RMKE.JK", name: "RMK Energy", sector: "Energy", listingBoard: "Utama" },
  { ticker: "RMKO.JK", name: "Royaltama Mulia Kontraktorindo", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "ROCK.JK", name: "Rockfields Properti Indonesia", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "RODA.JK", name: "Pikko Land Development", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "RONY.JK", name: "Aracord Nusantara Group", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "ROTI.JK", name: "Nippon Indosari Corpindo", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "RSCH.JK", name: "Charlie Hospital Semarang", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "RSGK.JK", name: "Kedoya Adyaraya", sector: "Healthcare", listingBoard: "Pemantauan Khusus" },
  { ticker: "RUIS.JK", name: "Radiant Utama Interinsco", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "RUNS.JK", name: "Global Sukses Solusi", sector: "Technology", listingBoard: "Akselerasi" },
  { ticker: "SAFE.JK", name: "Steady Safe", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "SAGE.JK", name: "Saptausaha Gemilangindah", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "SAME.JK", name: "Sarana Meditama Metropolitan T", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "SAMF.JK", name: "Saraswanti Anugerah Makmur", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "SAPX.JK", name: "Satria Antaran Prima", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "SATU.JK", name: "Kota Satu Properti", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "SBAT.JK", name: "Sejahtera Bintang Abadi Textil", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "SBMA.JK", name: "Surya Biru Murni Acetylene", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SCCO.JK", name: "Supreme Cable Manufacturing &", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "SCMA.JK", name: "Surya Citra Media", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "SCNP.JK", name: "Selaras Citra Nusantara Perkas", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SCPI.JK", name: "Organon Pharma Indonesia", sector: "Healthcare", listingBoard: "Pemantauan Khusus" },
  { ticker: "SDMU.JK", name: "Sidomulyo Selaras", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "SDPC.JK", name: "Millennium Pharmacon Internati", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SDRA.JK", name: "Bank Woori Saudara Indonesia 1", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "SEMA.JK", name: "Semacom Integrated", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "SFAN.JK", name: "Surya Fajar Capital", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "SGER.JK", name: "Sumber Global Energy", sector: "Energy", listingBoard: "Utama" },
  { ticker: "SGRO.JK", name: "Sampoerna Agro", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "SHID.JK", name: "Hotel Sahid Jaya International", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SHIP.JK", name: "Sillo Maritime Perdana", sector: "Energy", listingBoard: "Utama" },
  { ticker: "SICO.JK", name: "Sigma Energy Compressindo", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "SIDO.JK", name: "Industri Jamu dan Farmasi Sido", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "SILO.JK", name: "Siloam International Hospitals", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "SIMA.JK", name: "Siwani Makmur", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "SIMP.JK", name: "Salim Ivomas Pratama", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "SINI.JK", name: "Singaraja Putra", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "SIPD.JK", name: "Sreeya Sewu Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "SKBM.JK", name: "Sekar Bumi", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SKLT.JK", name: "Sekar Laut", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SKRN.JK", name: "Superkrane Mitra Utama", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "SKYB.JK", name: "Northcliff Citranusa Indonesia", sector: "Technology", listingBoard: "Pemantauan Khusus" },
  { ticker: "SLIS.JK", name: "Gaya Abadi Sempurna", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SMAR.JK", name: "Sinar Mas Agro Resources and T", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "SMBR.JK", name: "Semen Baturaja", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "SMCB.JK", name: "Solusi Bangun Indonesia", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "SMDM.JK", name: "Suryamas Dutamakmur", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "SMDR.JK", name: "Samudera Indonesia", sector: "Transportation & Logistics", listingBoard: "Utama" },
  { ticker: "SMGA.JK", name: "Sumber Mineral Global Abadi Tb", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SMGR.JK", name: "Semen Indonesia (Persero)", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "SMIL.JK", name: "Sarana Mitra Luas", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "SMKL.JK", name: "Satyamitra Kemas Lestari", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SMKM.JK", name: "Sumber Mas Konstruksi", sector: "Infrastructures", listingBoard: "Akselerasi" },
  { ticker: "SMLE.JK", name: "Sinergi Multi Lestarindo", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SMMA.JK", name: "Sinarmas Multiartha", sector: "Financials", listingBoard: "Utama" },
  { ticker: "SMMT.JK", name: "Golden Eagle Energy", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "SMRA.JK", name: "Summarecon Agung", sector: "Properties & Real Estate", listingBoard: "Utama" },
  { ticker: "SMRU.JK", name: "SMR Utama", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "SMSM.JK", name: "Selamat Sempurna", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "SNLK.JK", name: "Sunter Lakeside Hotel", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SOCI.JK", name: "Soechi Lines", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "SOFA.JK", name: "Solusi Environment Asia", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "SOHO.JK", name: "Soho Global Health", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "SOLA.JK", name: "Xolare RCR Energy", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SONA.JK", name: "Sona Topas Tourism Industry Tb", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SOSS.JK", name: "Shield On Service", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "SOTS.JK", name: "Satria Mega Kencana", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SOUL.JK", name: "Mitra Tirta Buwana", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "SPMA.JK", name: "Suparma", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SPRE.JK", name: "Soraya Berjaya Indonesia", sector: "Consumer Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "SPTO.JK", name: "Surya Pertiwi", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "SQMI.JK", name: "Wilton Makmur Indonesia", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "SRAJ.JK", name: "Sejahteraraya Anugrahjaya", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "SRIL.JK", name: "Sri Rejeki Isman", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "SRSN.JK", name: "Indo Acidatama", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SRTG.JK", name: "Saratoga Investama Sedaya", sector: "Financials", listingBoard: "Utama" },
  { ticker: "SSIA.JK", name: "Surya Semesta Internusa", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "SSMS.JK", name: "Sawit Sumbermas Sarana", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "SSTM.JK", name: "Sunson Textile Manufacture", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "STAA.JK", name: "Sumber Tani Agung Resources Tb", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "STAR.JK", name: "Buana Artha Anugerah", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "STRK.JK", name: "Lovina Beach Brewery", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "STTP.JK", name: "Siantar Top", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "SUGI.JK", name: "Sugih Energy", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "SULI.JK", name: "SLJ Global", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "SUNI.JK", name: "Sunindo Pratama", sector: "Energy", listingBoard: "Utama" },
  { ticker: "SUPA.JK", name: "Super Bank Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "SUPR.JK", name: "Solusi Tunas Pratama", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "SURE.JK", name: "Super Energy", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "SURI.JK", name: "Maja Agung Latexindo", sector: "Healthcare", listingBoard: "Pengembangan" },
  { ticker: "SWAT.JK", name: "Sriwahana Adityakarta", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "SWID.JK", name: "Saraswanti Indoland Developmen", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TALF.JK", name: "Tunas Alfin", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "TAMA.JK", name: "Lancartama Sejati", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "TAMU.JK", name: "Pelayaran Tamarin Samudra", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "TAPG.JK", name: "Triputra Agro Persada", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "TARA.JK", name: "Agung Semesta Sejahtera", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "TAXI.JK", name: "Express Transindo Utama", sector: "Transportation & Logistics", listingBoard: "Pemantauan Khusus" },
  { ticker: "TAYS.JK", name: "Jaya Swarasa Agung", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TBIG.JK", name: "Tower Bersama Infrastructure T", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "TBLA.JK", name: "Tunas Baru Lampung", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "TBMS.JK", name: "Tembaga Mulia Semanan", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "TCID.JK", name: "Mandom Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TCPI.JK", name: "Transcoal Pacific", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "TDPM.JK", name: "Tianrong Chemicals Industry Tb", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "TEBE.JK", name: "Dana Brata Luhur", sector: "Energy", listingBoard: "Utama" },
  { ticker: "TECH.JK", name: "Indosterling Technomedia", sector: "Technology", listingBoard: "Pemantauan Khusus" },
  { ticker: "TELE.JK", name: "Omni Inovasi Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "TFAS.JK", name: "Telefast Indonesia", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "TFCO.JK", name: "Tifico Fiber Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "TGKA.JK", name: "Tigaraksa Satria", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TGRA.JK", name: "Terregra Asia Energy", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "TGUK.JK", name: "Platinum Wahab Nusantara", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "TIFA.JK", name: "KDB Tifa Finance", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "TINS.JK", name: "Timah", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "TIRA.JK", name: "Tira Austenite", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "TIRT.JK", name: "Tirta Mahakam Resources", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "TKIM.JK", name: "Pabrik Kertas Tjiwi Kimia", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "TLDN.JK", name: "Teladan Prima Agro", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TLKM.JK", name: "Telkom Indonesia (Persero)", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "TMAS.JK", name: "Temas", sector: "Transportation & Logistics", listingBoard: "Utama" },
  { ticker: "TMPO.JK", name: "Tempo Intimedia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TNCA.JK", name: "Trimuda Nuansa Citra", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "TOBA.JK", name: "TBS Energi Utama", sector: "Energy", listingBoard: "Utama" },
  { ticker: "TOOL.JK", name: "Rohartindo Nusantara Luas", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TOPS.JK", name: "Totalindo Eka Persada", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "TOSK.JK", name: "Topindo Solusi Komunika", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "TOTL.JK", name: "Total Bangun Persada", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "TOTO.JK", name: "Surya Toto Indonesia", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "TOWR.JK", name: "Sarana Menara Nusantara", sector: "Infrastructures", listingBoard: "Utama" },
  { ticker: "TOYS.JK", name: "Sunindo Adipersada", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "TPIA.JK", name: "Chandra Asri Pacific", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "TPMA.JK", name: "Trans Power Marine", sector: "Energy", listingBoard: "Utama" },
  { ticker: "TRAM.JK", name: "Trada Alam Minera", sector: "Energy", listingBoard: "Pemantauan Khusus" },
  { ticker: "TRGU.JK", name: "Cerestar Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "TRIL.JK", name: "Triwira Insanlestari", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "TRIM.JK", name: "Trimegah Sekuritas Indonesia T", sector: "Financials", listingBoard: "Utama" },
  { ticker: "TRIN.JK", name: "Perintis Triniti Properti", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "TRIO.JK", name: "Trikomsel Oke", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "TRIS.JK", name: "Trisula International", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "TRJA.JK", name: "Transkon Jaya", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "TRON.JK", name: "Teknologi Karya Digital Nusa T", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "TRST.JK", name: "Trias Sentosa", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "TRUE.JK", name: "Triniti Dinamik", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "TRUK.JK", name: "Guna Timur Raya", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "TRUS.JK", name: "Trust Finance Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "TSPC.JK", name: "Tempo Scan Pacific", sector: "Healthcare", listingBoard: "Utama" },
  { ticker: "TUGU.JK", name: "Asuransi Tugu Pratama Indonesi", sector: "Financials", listingBoard: "Utama" },
  { ticker: "TYRE.JK", name: "King Tire Indonesia", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "UANG.JK", name: "Pakuan", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "UCID.JK", name: "Uni-Charm Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "UDNG.JK", name: "Agro Bahari Nusantara", sector: "Consumer Non-Cyclicals", listingBoard: "Akselerasi" },
  { ticker: "UFOE.JK", name: "Damai Sejahtera Abadi", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ULTJ.JK", name: "Ultrajaya Milk Industry & Trad", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "UNIC.JK", name: "Unggul Indah Cahaya", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "UNIQ.JK", name: "Ulima Nitra", sector: "Energy", listingBoard: "Utama" },
  { ticker: "UNIT.JK", name: "Nusantara Inti Corpora", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "UNSP.JK", name: "Bakrie Sumatera Plantations Tb", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "UNTD.JK", name: "Terang Dunia Internusa", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "UNTR.JK", name: "United Tractors", sector: "Industrials", listingBoard: "Utama" },
  { ticker: "UNVR.JK", name: "Unilever Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "URBN.JK", name: "Urban Jakarta Propertindo", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "UVCR.JK", name: "Trimegah Karya Pratama", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "VAST.JK", name: "Vastland Indonesia", sector: "Properties & Real Estate", listingBoard: "Pengembangan" },
  { ticker: "VERN.JK", name: "Verona Indah Pictures", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "VICI.JK", name: "Victoria Care Indonesia", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "VICO.JK", name: "Victoria Investama", sector: "Financials", listingBoard: "Utama" },
  { ticker: "VINS.JK", name: "Victoria Insurance", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "VISI.JK", name: "Satu Visi Putra", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "VIVA.JK", name: "Visi Media Asia", sector: "Consumer Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "VKTR.JK", name: "VKTR Teknologi Mobilitas", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "VOKS.JK", name: "Voksel Electric", sector: "Industrials", listingBoard: "Pengembangan" },
  { ticker: "VRNA.JK", name: "Mizuho Leasing Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "VTNY.JK", name: "Venteny Fortuna International", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "WAPO.JK", name: "Wahana Pronatural", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "WEGE.JK", name: "Wijaya Karya Bangunan Gedung T", sector: "Infrastructures", listingBoard: "Pengembangan" },
  { ticker: "WEHA.JK", name: "WEHA Transportasi Indonesia Tb", sector: "Transportation & Logistics", listingBoard: "Pengembangan" },
  { ticker: "WGSH.JK", name: "Wira Global Solusi", sector: "Technology", listingBoard: "Akselerasi" },
  { ticker: "WICO.JK", name: "Wicaksana Overseas Internation", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "WIDI.JK", name: "Widiant Jaya Krenindo", sector: "Industrials", listingBoard: "Akselerasi" },
  { ticker: "WIFI.JK", name: "Solusi Sinergi Digital", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "WIIM.JK", name: "Wismilak Inti Makmur", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "WIKA.JK", name: "Wijaya Karya (Persero)", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "WINE.JK", name: "Hatten Bali", sector: "Consumer Non-Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "WINR.JK", name: "Winner Nusantara Jaya", sector: "Properties & Real Estate", listingBoard: "Pemantauan Khusus" },
  { ticker: "WINS.JK", name: "Wintermar Offshore Marine", sector: "Energy", listingBoard: "Utama" },
  { ticker: "WIRG.JK", name: "WIR ASIA", sector: "Technology", listingBoard: "Pengembangan" },
  { ticker: "WMPP.JK", name: "Widodo Makmur Perkasa", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "WMUU.JK", name: "Widodo Makmur Unggas", sector: "Consumer Non-Cyclicals", listingBoard: "Pemantauan Khusus" },
  { ticker: "WOMF.JK", name: "Wahana Ottomitra Multiartha Tb", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "WOOD.JK", name: "Integra Indocabinet", sector: "Consumer Cyclicals", listingBoard: "Utama" },
  { ticker: "WOWS.JK", name: "Ginting Jaya Energi", sector: "Energy", listingBoard: "Pengembangan" },
  { ticker: "WSBP.JK", name: "Waskita Beton Precast", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "WSKT.JK", name: "Waskita Karya (Persero)", sector: "Infrastructures", listingBoard: "Pemantauan Khusus" },
  { ticker: "WTON.JK", name: "Wijaya Karya Beton", sector: "Basic Materials", listingBoard: "Utama" },
  { ticker: "YELO.JK", name: "Yelooo Integra Datanet", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "YOII.JK", name: "Asuransi Digital Bersama", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "YPAS.JK", name: "Yanaprima Hastapersada", sector: "Basic Materials", listingBoard: "Pengembangan" },
  { ticker: "YULE.JK", name: "Yulie Sekuritas Indonesia", sector: "Financials", listingBoard: "Pengembangan" },
  { ticker: "YUPI.JK", name: "Yupi Indo Jelly Gum", sector: "Consumer Non-Cyclicals", listingBoard: "Utama" },
  { ticker: "ZATA.JK", name: "Bersama Zatta Jaya", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ZBRA.JK", name: "Dosni Roha Indonesia", sector: "Industrials", listingBoard: "Pemantauan Khusus" },
  { ticker: "ZINC.JK", name: "Kapuas Prima Coal", sector: "Basic Materials", listingBoard: "Pemantauan Khusus" },
  { ticker: "ZONE.JK", name: "Mega Perintis", sector: "Consumer Cyclicals", listingBoard: "Pengembangan" },
  { ticker: "ZYRX.JK", name: "Zyrexindo Mandiri Buana", sector: "Technology", listingBoard: "Pengembangan" }
];
var ALL_TICKERS = IDX_STOCKS.map((s) => s.ticker);

// src/lib/constants.ts
var SITE_URL = "https://teknikal.id";
var SECTORS = [...new Set(IDX_STOCKS.map((s) => s.sector))].sort();

// src/lib/socket.ts
var io = null;
function parseCookies(cookieHeader) {
  const cookies = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}
async function authenticateSocket(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  const token = cookies["authjs.session-token"] ?? cookies["__Secure-authjs.session-token"];
  if (!token) return null;
  try {
    const decoded = await (0, import_jwt.decode)({
      token,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
      salt: "authjs.session-token"
    });
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}
function initIO(httpServer) {
  const allowedOrigins = process.env.NODE_ENV === "production" ? [SITE_URL] : [SITE_URL, "http://localhost:3000"];
  io = new import_socket.Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });
  io.use(async (socket, next) => {
    const userId = await authenticateSocket(socket.request);
    if (!userId) return next(new Error("auth_required"));
    socket.data.userId = userId;
    next();
  });
  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    socket.on("join:stock", (ticker) => {
      if (typeof ticker !== "string" || !ticker) return;
      socket.join(`stock:${ticker}`);
      broadcastPresence(`stock:${ticker}`, ticker);
    });
    socket.on("leave:stock", (ticker) => {
      if (typeof ticker !== "string" || !ticker) return;
      socket.leave(`stock:${ticker}`);
      broadcastPresence(`stock:${ticker}`, ticker);
    });
    socket.on("join:community", () => {
      socket.join("community");
    });
    socket.on("leave:community", () => {
      socket.leave("community");
    });
    socket.on("join:post", (postId) => {
      if (typeof postId !== "string" || !postId) return;
      socket.join(`post:${postId}`);
    });
    socket.on("leave:post", (postId) => {
      if (typeof postId !== "string" || !postId) return;
      socket.leave(`post:${postId}`);
    });
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("stock:")) {
          broadcastPresence(room, room.slice(6));
        }
      }
    });
  });
  return io;
}
function broadcastPresence(room, ticker) {
  const count = io.sockets.adapter.rooms.get(room)?.size ?? 0;
  io.to(room).emit("presence:update", { ticker, count });
}

// server.ts
var port = parseInt(process.env.PORT || "3000", 10);
var dir = process.cwd();
var { config: nextConfig } = JSON.parse(
  (0, import_fs.readFileSync)((0, import_path.join)(dir, ".next/required-server-files.json"), "utf-8")
);
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
var { initialize } = require("next/dist/server/lib/router-server.js");
async function start() {
  const { requestHandler } = await initialize({
    dir,
    port,
    hostname: process.env.HOSTNAME || "0.0.0.0",
    dev: false,
    minimalMode: false,
    quiet: false
  });
  const httpServer = (0, import_http.createServer)((req, res) => {
    (0, import_compression.default)()(req, res, () => {
      requestHandler(req, res);
    });
  });
  initIO(httpServer);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (Next.js + Socket.IO)`);
  });
}
start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
/*! Bundled license information:

negotiator/index.js:
  (*!
   * negotiator
   * Copyright(c) 2012 Federico Romero
   * Copyright(c) 2012-2014 Isaac Z. Schlueter
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

safe-buffer/index.js:
  (*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> *)

bytes/index.js:
  (*!
   * bytes
   * Copyright(c) 2012-2014 TJ Holowaychuk
   * Copyright(c) 2015 Jed Watson
   * MIT Licensed
   *)

mime-db/index.js:
  (*!
   * mime-db
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

compressible/index.js:
  (*!
   * compressible
   * Copyright(c) 2013 Jonathan Ong
   * Copyright(c) 2014 Jeremiah Senkpiel
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

on-headers/index.js:
  (*!
   * on-headers
   * Copyright(c) 2014 Douglas Christopher Wilson
   * MIT Licensed
   *)

vary/index.js:
  (*!
   * vary
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)

compression/index.js:
  (*!
   * compression
   * Copyright(c) 2010 Sencha Inc.
   * Copyright(c) 2011 TJ Holowaychuk
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2014-2015 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
