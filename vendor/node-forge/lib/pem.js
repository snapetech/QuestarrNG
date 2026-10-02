/**
 * Javascript implementation of basic PEM (Privacy Enhanced Mail) algorithms.
 *
 * See: RFC 1421.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2013-2014 Digital Bazaar, Inc.
 *
 * A Forge PEM object has the following fields:
 *
 * type: identifies the type of message (eg: "RSA PRIVATE KEY").
 *
 * procType: identifies the type of processing performed on the message,
 *   it has two subfields: version and type, eg: 4,ENCRYPTED.
 *
 * contentDomain: identifies the type of content in the message, typically
 *   only uses the value: "RFC822".
 *
 * dekInfo: identifies the message encryption algorithm and mode and includes
 *   any parameters for the algorithm, it has two subfields: algorithm and
 *   parameters, eg: DES-CBC,F8143EDE5960C597.
 *
 * headers: contains all other PEM encapsulated headers -- where order is
 *   significant (for pairing data like recipient ID + key info).
 *
 * body: the binary-encoded body.
 */
var forge = require('./forge');
require('./util');

// shortcut for pem API
var pem = module.exports = forge.pem = forge.pem || {};

/**
 * Encodes (serializes) the given PEM object.
 *
 * @param msg the PEM message object to encode.
 * @param options the options to use:
 *          maxline the maximum characters per line for the body, (default: 64).
 *
 * @return the PEM-formatted string.
 */
pem.encode = function(msg, options) {
  options = options || {};
  var rval = '-----BEGIN ' + msg.type + '-----\r\n';

  // encode special headers
  var header;
  if(msg.procType) {
    header = {
      name: 'Proc-Type',
      values: [String(msg.procType.version), msg.procType.type]
    };
    rval += foldHeader(header);
  }
  if(msg.contentDomain) {
    header = {name: 'Content-Domain', values: [msg.contentDomain]};
    rval += foldHeader(header);
  }
  if(msg.dekInfo) {
    header = {name: 'DEK-Info', values: [msg.dekInfo.algorithm]};
    if(msg.dekInfo.parameters) {
      header.values.push(msg.dekInfo.parameters);
    }
    rval += foldHeader(header);
  }

  if(msg.headers) {
    // encode all other headers
    for(var i = 0; i < msg.headers.length; ++i) {
      rval += foldHeader(msg.headers[i]);
    }
  }

  // terminate header
  if(msg.procType) {
    rval += '\r\n';
  }

  // add body
  rval += forge.util.encode64(msg.body, options.maxline || 64) + '\r\n';

  rval += '-----END ' + msg.type + '-----\r\n';
  return rval;
};

/**
 * Decodes (deserializes) all PEM messages found in the given string.
 *
 * @param str the PEM-formatted string to decode.
 *
 * @return the PEM message objects in an array.
 */
pem.decode = function(str) {
  var rval = [];
  var maxPemLength = 4 * 1024 * 1024;
  if(typeof str !== 'string' || str.length > maxPemLength) {
    throw new Error('Invalid PEM formatted message.');
  }

  // Scan boundaries with indexOf instead of a backtracking expression. PEM
  // input may be supplied by callers and must not make parsing superlinear.
  var cursor = 0;
  var beginMarker = '-----BEGIN ';
  while(cursor < str.length) {
    var beginIndex = str.indexOf(beginMarker, cursor);
    if(beginIndex === -1) {
      break;
    }

    var typeStart = beginIndex + beginMarker.length;
    var typeEnd = str.indexOf('-----', typeStart);
    if(typeEnd === -1) {
      break;
    }
    var type = str.slice(typeStart, typeEnd);
    var validType = type.length > 0;
    for(var ti = 0; validType && ti < type.length; ++ti) {
      var typeChar = type.charCodeAt(ti);
      validType = (typeChar >= 65 && typeChar <= 90) ||
        (typeChar >= 48 && typeChar <= 57) || typeChar === 45 || typeChar === 32;
    }
    if(!validType) {
      cursor = typeStart;
      continue;
    }

    var bodyStart = typeEnd + 5;
    if(str.slice(bodyStart, bodyStart + 2) === '\r\n') {
      bodyStart += 2;
    } else if(str[bodyStart] === '\n') {
      ++bodyStart;
    }
    var endMarker = '-----END ' + type + '-----';
    var endIndex = str.indexOf(endMarker, bodyStart);
    if(endIndex === -1) {
      // No later block can be parsed without this block's matching boundary;
      // stop here so a string full of unmatched BEGIN markers stays linear.
      break;
    }

    var content = str.slice(bodyStart, endIndex);
    var crlfSeparator = content.indexOf('\r\n\r\n');
    var lfSeparator = content.indexOf('\n\n');
    var separatorIndex = crlfSeparator;
    var separatorLength = 4;
    if(separatorIndex === -1 ||
      (lfSeparator !== -1 && lfSeparator < separatorIndex)) {
      separatorIndex = lfSeparator;
      separatorLength = 2;
    }
    var headerText = separatorIndex === -1 ? null :
      content.slice(0, separatorIndex + separatorLength);
    var body = separatorIndex === -1 ? content :
      content.slice(separatorIndex + separatorLength);
    var validBody = body.length > 0;
    for(var bi = 0; validBody && bi < body.length; ++bi) {
      var bodyChar = body.charCodeAt(bi);
      validBody = (bodyChar >= 65 && bodyChar <= 90) ||
        (bodyChar >= 97 && bodyChar <= 122) ||
        (bodyChar >= 48 && bodyChar <= 57) || bodyChar === 43 ||
        bodyChar === 47 || bodyChar === 61 || bodyChar === 58 ||
        body[bi].trim() === '';
    }
    if(!validBody) {
      cursor = endIndex + endMarker.length;
      continue;
    }

    // accept "NEW CERTIFICATE REQUEST" as "CERTIFICATE REQUEST"
    // https://datatracker.ietf.org/doc/html/rfc7468#section-7
    if(type === 'NEW CERTIFICATE REQUEST') {
      type = 'CERTIFICATE REQUEST';
    }

    var msg = {
      type: type,
      procType: null,
      contentDomain: null,
      dekInfo: null,
      headers: [],
      body: forge.util.decode64(body)
    };
    rval.push(msg);

    // no headers
    if(headerText === null) {
      cursor = endIndex + endMarker.length;
      continue;
    }

    // parse headers
    var lines = headerText.split('\n');
    var li = 0;
    while(li < lines.length) {
      // get line, trim any rhs whitespace
      var line = lines[li].trimEnd();

      // RFC2822 unfold any following folded lines
      for(var nl = li + 1; nl < lines.length; ++nl) {
        var next = lines[nl];
        if(next.length === 0 || next[0].trim() !== '') {
          break;
        }
        line += next;
        li = nl;
      }

      // parse header
      var colon = line.lastIndexOf(':');
      var headerName = colon === -1 ? '' : line.slice(0, colon);
      var headerValue = colon === -1 ? '' : line.slice(colon + 1);
      var validHeader = headerName.length > 0 && headerValue.length > 0;
      for(var hi = 0; validHeader && hi < headerName.length; ++hi) {
        var headerChar = headerName.charCodeAt(hi);
        validHeader = headerChar >= 33 && headerChar <= 126;
      }
      for(var hvi = 0; validHeader && hvi < headerValue.length; ++hvi) {
        var headerValueChar = headerValue.charCodeAt(hvi);
        validHeader = (headerValueChar >= 33 && headerValueChar <= 126) ||
          headerValue[hvi].trim() === '';
      }
      if(validHeader) {
        var header = {name: headerName, values: []};
        var values = headerValue.trimStart().split(',');
        for(var vi = 0; vi < values.length; ++vi) {
          header.values.push(ltrim(values[vi]));
        }

        // Proc-Type must be the first header
        if(!msg.procType) {
          if(header.name !== 'Proc-Type') {
            throw new Error('Invalid PEM formatted message. The first ' +
              'encapsulated header must be "Proc-Type".');
          } else if(header.values.length !== 2) {
            throw new Error('Invalid PEM formatted message. The "Proc-Type" ' +
              'header must have two subfields.');
          }
          msg.procType = {version: values[0], type: values[1]};
        } else if(!msg.contentDomain && header.name === 'Content-Domain') {
          // special-case Content-Domain
          msg.contentDomain = values[0] || '';
        } else if(!msg.dekInfo && header.name === 'DEK-Info') {
          // special-case DEK-Info
          if(header.values.length === 0) {
            throw new Error('Invalid PEM formatted message. The "DEK-Info" ' +
              'header must have at least one subfield.');
          }
          msg.dekInfo = {algorithm: values[0], parameters: values[1] || null};
        } else {
          msg.headers.push(header);
        }
      } else {
        break;
      }

      ++li;
    }

    if(msg.procType === 'ENCRYPTED' && !msg.dekInfo) {
      throw new Error('Invalid PEM formatted message. The "DEK-Info" ' +
        'header must be present if "Proc-Type" is "ENCRYPTED".');
    }
    cursor = endIndex + endMarker.length;
  }

  if(rval.length === 0) {
    throw new Error('Invalid PEM formatted message.');
  }

  return rval;
};

function foldHeader(header) {
  var rval = header.name + ': ';

  // ensure values with CRLF are folded
  var values = [];
  var insertSpace = function(match, $1) {
    return ' ' + $1;
  };
  for(var i = 0; i < header.values.length; ++i) {
    values.push(header.values[i].replace(/^(\S+\r\n)/, insertSpace));
  }
  rval += values.join(',') + '\r\n';

  // do folding
  var length = 0;
  var candidate = -1;
  for(var i = 0; i < rval.length; ++i, ++length) {
    if(length > 65 && candidate !== -1) {
      var insert = rval[candidate];
      if(insert === ',') {
        ++candidate;
        rval = rval.substr(0, candidate) + '\r\n ' + rval.substr(candidate);
      } else {
        rval = rval.substr(0, candidate) +
          '\r\n' + insert + rval.substr(candidate + 1);
      }
      length = (i - candidate - 1);
      candidate = -1;
      ++i;
    } else if(rval[i] === ' ' || rval[i] === '\t' || rval[i] === ',') {
      candidate = i;
    }
  }

  return rval;
}

function ltrim(str) {
  return str.replace(/^\s+/, '');
}
