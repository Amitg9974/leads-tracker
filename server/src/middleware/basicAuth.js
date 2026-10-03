const crypto = require('crypto');

const digest = (value) => crypto.createHash('sha256').update(value).digest();

/**
 * HTTP Basic authentication. Browsers show their own sign-in prompt when they
 * receive the WWW-Authenticate header, then re-send the credentials automatically.
 */
function basicAuth({ user, password }) {
  const expected = digest(`${user}:${password}`);

  return (req, res, next) => {
    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    if (scheme && scheme.toLowerCase() === 'basic' && encoded) {
      const provided = digest(Buffer.from(encoded, 'base64').toString('utf8'));
      if (crypto.timingSafeEqual(provided, expected)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Leads Tracker", charset="UTF-8"');
    res.status(401).json({ error: { message: 'Authentication required' } });
  };
}

module.exports = { basicAuth };
