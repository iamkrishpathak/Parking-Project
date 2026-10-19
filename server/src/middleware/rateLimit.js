const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 30, message = 'Too many requests. Please try again later.' } = {}) =>
  (req, res, next) => {
    const key = `${req.user?._id || req.ip}:${req.baseUrl}${req.route?.path || req.path}`;
    const now = Date.now();
    if (buckets.size > 10_000) {
      for (const [bucketKey, current] of buckets) {
        if (current.resetAt <= now) buckets.delete(bucketKey);
        if (buckets.size <= 8_000) break;
      }
    }
    if (buckets.size > 12_000) buckets.delete(buckets.keys().next().value);
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    return next();
  };

module.exports = rateLimit;
