'use strict'

const crypto = require('crypto')

function randomString (size) {
  const bits = (size + 1) * 6
  const buffer = crypto.randomBytes(Math.ceil(bits / 8))
  const string = buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return string.slice(0, size)
}

function calculatePayloadHash (payload, algorithm, contentType) {
  const hash = crypto.createHash(algorithm)
  hash.update('hawk.1.payload\n')
  hash.update(
    (contentType
      ? contentType
          .split(';')[0]
          .trim()
          .toLowerCase()
      : '') + '\n'
  )
  hash.update(payload || '')
  hash.update('\n')
  return hash.digest('base64')
}

function calculateMac (credentials, opts) {
  let normalized =
    'hawk.1.header\n' +
    opts.ts +
    '\n' +
    opts.nonce +
    '\n' +
    (opts.method || '').toUpperCase() +
    '\n' +
    opts.resource +
    '\n' +
    opts.host.toLowerCase() +
    '\n' +
    opts.port +
    '\n' +
    (opts.hash || '') +
    '\n'

  if (opts.ext) {
    normalized =
      normalized + opts.ext.replace('\\', '\\\\').replace('\n', '\\n')
  }

  normalized = normalized + '\n'

  if (opts.app) {
    normalized = normalized + opts.app + '\n' + (opts.dlg || '') + '\n'
  }

  const hmac = crypto
    .createHmac(credentials.algorithm, credentials.key)
    .update(normalized)
  const digest = hmac.digest('base64')
  return digest
}

function header (uri, method, opts) {
  const timestamp =
    opts.timestamp ||
    Math.floor((Date.now() + (opts.localtimeOffsetMsec || 0)) / 1000)
  const { credentials } = opts
  if (
    !credentials ||
    !credentials.id ||
    !credentials.key ||
    !credentials.algorithm
  ) {
    return ''
  }

  if (['sha1', 'sha256'].indexOf(credentials.algorithm) === -1) {
    return ''
  }

  const artifacts = {
    ts: timestamp,
    nonce: opts.nonce || randomString(6),
    method: method,
    resource: uri.pathname + (uri.search || ''),
    host: uri.hostname,
    port: uri.port || (uri.protocol === 'http:' ? 80 : 443),
    hash: opts.hash,
    ext: opts.ext,
    app: opts.app,
    dlg: opts.dlg
  }

  if (!artifacts.hash && (opts.payload || opts.payload === '')) {
    artifacts.hash = calculatePayloadHash(
      opts.payload,
      credentials.algorithm,
      opts.contentType
    )
  }

  const mac = calculateMac(credentials, artifacts)

  const hasExt =
    artifacts.ext !== null &&
    artifacts.ext !== undefined &&
    artifacts.ext !== ''
  let header =
    'Hawk id="' +
    credentials.id +
    '", ts="' +
    artifacts.ts +
    '", nonce="' +
    artifacts.nonce +
    (artifacts.hash ? '", hash="' + artifacts.hash : '') +
    (hasExt
      ? '", ext="' + artifacts.ext.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      : '') +
    '", mac="' +
    mac +
    '"'

  if (artifacts.app) {
    header =
      header +
      ', app="' +
      artifacts.app +
      (artifacts.dlg ? '", dlg="' + artifacts.dlg : '') +
      '"'
  }

  return header
}

module.exports = { calculateMac, header }
