# Security Guide for Web Forms

This guide provides practical, actionable steps to secure web forms and applications before deploying to production environments like GitHub Pages. While Lyra Exporter is a client-side application that doesn't handle server-side form submissions, these guidelines are essential for any web application that processes user input or integrates with backend services.

## Table of Contents

1. [Server-Side Validation](#1-server-side-validation)
2. [Input Sanitization](#2-input-sanitization)
3. [CSRF Protection](#3-csrf-protection)
4. [HTTPS/TLS Configuration](#4-httpstls-configuration)
5. [Rate Limiting](#5-rate-limiting)
6. [Bot Protection (CAPTCHA/reCAPTCHA)](#6-bot-protection-captcharecaptcha)
7. [Secrets Management](#7-secrets-management)
8. [Content Security Policy (CSP)](#8-content-security-policy-csp)
9. [Security Headers](#9-security-headers)
10. [XSS Protection](#10-xss-protection)
11. [SQL Injection Prevention](#11-sql-injection-prevention)
12. [Logging and Monitoring](#12-logging-and-monitoring)
13. [Pre-Deploy Security Checklist](#13-pre-deploy-security-checklist)

---

## 1. Server-Side Validation

**Never trust client-side validation alone.** Always validate and sanitize user input on the server.

### Best Practices:
- Validate data types, formats, lengths, and ranges
- Use allow-lists instead of deny-lists when possible
- Validate file uploads (type, size, content)
- Return meaningful error messages without exposing system details

### Node.js Example with Express:

```javascript
const express = require('express');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

app.post('/api/submit-form', [
  // Validation rules
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('message').trim().isLength({ min: 10, max: 5000 }).escape(),
], (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Process validated data
  const { email, name, message } = req.body;
  // ... handle form submission
  res.json({ success: true, message: 'Form submitted successfully' });
});
```

---

## 2. Input Sanitization

Sanitize all user input to prevent injection attacks.

### Best Practices:
- HTML-encode output to prevent XSS
- Remove or escape dangerous characters
- Use established libraries for sanitization
- Sanitize file names and paths

### Node.js Example:

```javascript
const DOMPurify = require('isomorphic-dompurify');

function sanitizeHtmlInput(input) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
}

app.post('/api/content', (req, res) => {
  const sanitizedContent = sanitizeHtmlInput(req.body.content);
  // Store sanitized content
  res.json({ success: true });
});
```

---

## 3. CSRF Protection

Cross-Site Request Forgery (CSRF) attacks trick users into performing unwanted actions. Protect against them with CSRF tokens.

### Best Practices:
- Use CSRF tokens for state-changing operations
- Verify Origin/Referer headers
- Use SameSite cookie attribute
- Implement double-submit cookie pattern

### Node.js Example with csurf:

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

// Setup CSRF protection
const csrfProtection = csrf({ cookie: true });
app.use(cookieParser());

// Send CSRF token to client
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protect POST endpoint
app.post('/api/submit-form', csrfProtection, (req, res) => {
  // Token is automatically validated
  // Process request...
  res.json({ success: true });
});
```

**Client-side usage:**

```javascript
// Fetch CSRF token
const response = await fetch('/api/csrf-token');
const { csrfToken } = await response.json();

// Include token in form submission
await fetch('/api/submit-form', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify(formData)
});
```

---

## 4. HTTPS/TLS Configuration

**Always use HTTPS in production** to encrypt data in transit.

### Best Practices:
- Use TLS 1.2 or higher
- Use strong cipher suites
- Enable HTTP Strict Transport Security (HSTS)
- Redirect HTTP to HTTPS
- Use Let's Encrypt for free certificates

### GitHub Pages:
GitHub Pages automatically provides HTTPS for `*.github.io` domains and custom domains. Enable "Enforce HTTPS" in repository settings.

### Node.js/Express Example:

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next();
  } else {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
});

https.createServer(options, app).listen(443);
```

---

## 5. Rate Limiting

Prevent abuse and DoS attacks by limiting request rates.

### Best Practices:
- Limit requests per IP address
- Use different limits for different endpoints
- Consider user authentication level
- Return appropriate 429 status codes

### Node.js Example with express-rate-limit:

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for form submissions
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 submissions per hour
  message: 'Too many form submissions, please try again later.'
});

// Apply limiters
app.use('/api/', apiLimiter);
app.post('/api/submit-form', formLimiter, (req, res) => {
  // Handle form submission
});
```

---

## 6. Bot Protection (CAPTCHA/reCAPTCHA)

Prevent automated bot submissions using CAPTCHA solutions.

### Options:
- **Google reCAPTCHA v3**: Invisible, score-based detection
- **Google reCAPTCHA v2**: Checkbox challenge
- **hCaptcha**: Privacy-focused alternative
- **Cloudflare Turnstile**: Privacy-respecting CAPTCHA alternative

### Google reCAPTCHA v3 Example:

**Client-side (HTML):**

```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>

<form id="myForm">
  <input type="email" name="email" required>
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById('myForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get reCAPTCHA token
  const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit_form' });
  
  // Submit form with token
  const formData = new FormData(e.target);
  formData.append('recaptcha_token', token);
  
  await fetch('/api/submit-form', {
    method: 'POST',
    body: formData
  });
});
</script>
```

**Server-side verification (Node.js):**

```javascript
const axios = require('axios');

async function verifyRecaptcha(token, remoteIP) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  const response = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    {
      params: {
        secret: secretKey,
        response: token,
        remoteip: remoteIP
      }
    }
  );
  
  return response.data;
}

app.post('/api/submit-form', async (req, res) => {
  const { recaptcha_token } = req.body;
  const clientIP = req.ip;
  
  // Verify reCAPTCHA token
  const recaptchaResult = await verifyRecaptcha(recaptcha_token, clientIP);
  
  if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
    return res.status(403).json({ 
      error: 'reCAPTCHA verification failed',
      score: recaptchaResult.score 
    });
  }
  
  // Process form submission
  res.json({ success: true });
});
```

---

## 7. Secrets Management

**Never commit secrets to version control.**

### Best Practices:
- Use environment variables for secrets
- Use GitHub Actions Secrets for CI/CD
- Use `.env` files locally (add to `.gitignore`)
- Rotate secrets regularly
- Use secret scanning tools

### GitHub Actions Secrets:

1. Go to repository **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add secrets like `RECAPTCHA_SECRET_KEY`, `DATABASE_URL`, etc.

### Usage in GitHub Actions:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          # Secrets available as environment variables
          npm run deploy
```

### Node.js with dotenv:

```javascript
// Load environment variables from .env file
require('dotenv').config();

const app = express();

// Access secrets from environment
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
```

**.env file (never commit this):**

```
DATABASE_URL=postgresql://user:pass@localhost/db
API_KEY=your-secret-api-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
```

**.gitignore:**

```
.env
.env.local
.env.*.local
```

---

## 8. Content Security Policy (CSP)

CSP helps prevent XSS attacks by controlling which resources can be loaded.

### Best Practices:
- Start with restrictive policy, gradually relax as needed
- Use nonces or hashes for inline scripts
- Avoid `unsafe-inline` and `unsafe-eval`
- Report violations to a monitoring endpoint

### Node.js Example with Helmet:

```javascript
const helmet = require('helmet');

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);
```

### HTML Meta Tag Alternative:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://trusted-cdn.com; 
               style-src 'self' 'unsafe-inline';">
```

---

## 9. Security Headers

Configure security headers to protect against common attacks.

### Essential Security Headers:

| Header | Purpose |
|--------|---------|
| `Strict-Transport-Security` | Force HTTPS (HSTS) |
| `X-Frame-Options` | Prevent clickjacking |
| `X-Content-Type-Options` | Prevent MIME sniffing |
| `Referrer-Policy` | Control referrer information |
| `Permissions-Policy` | Control browser features |
| `X-XSS-Protection` | Legacy XSS protection |

### Node.js Example with Helmet:

```javascript
const helmet = require('helmet');

app.use(helmet({
  // HSTS: Force HTTPS for 1 year
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  // Prevent MIME sniffing
  noSniff: true,
  // Referrer policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  // Disable X-Powered-By header
  hidePoweredBy: true,
}));

// Additional custom headers
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=()');
  next();
});
```

### Complete Security Headers Setup:

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// Apply comprehensive security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## 10. XSS Protection

Cross-Site Scripting (XSS) allows attackers to inject malicious scripts.

### Prevention Strategies:
- Escape all user input before rendering
- Use Content Security Policy
- Sanitize HTML input
- Use templating engines that auto-escape
- Validate and sanitize URLs

### React Example (auto-escapes by default):

```javascript
// Safe - React automatically escapes
function UserComment({ comment }) {
  return <div>{comment.text}</div>;
}

// Dangerous - dangerouslySetInnerHTML bypasses escaping
function RawHtml({ html }) {
  // Only use with sanitized content!
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Node.js Template Example:

```javascript
const express = require('express');
const handlebars = require('express-handlebars');

app.engine('hbs', handlebars.engine({
  defaultLayout: 'main',
  extname: '.hbs'
}));
app.set('view engine', 'hbs');

// Handlebars automatically escapes variables
app.get('/profile', (req, res) => {
  res.render('profile', {
    username: req.user.name, // Automatically escaped
    bio: req.user.bio // Automatically escaped
  });
});
```

---

## 11. SQL Injection Prevention

SQL injection occurs when user input is concatenated into SQL queries.

### Prevention Strategies:
- **Always use parameterized queries/prepared statements**
- Never concatenate user input into SQL strings
- Use ORMs (Sequelize, TypeORM, Prisma) that handle escaping
- Apply principle of least privilege for database users
- Validate and sanitize input as defense-in-depth

### Vulnerable Code (DON'T DO THIS):

```javascript
// VULNERABLE - Never do this!
app.post('/login', (req, res) => {
  const query = `SELECT * FROM users WHERE email = '${req.body.email}' 
                 AND password = '${req.body.password}'`;
  db.query(query, (err, results) => {
    // Attacker could inject: ' OR '1'='1
  });
});
```

### Secure Code with Parameterized Queries:

```javascript
// SECURE - Use parameterized queries
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Using parameterized query (mysql2)
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password]
  );
  
  if (rows.length > 0) {
    // User found
  }
});
```

### Using an ORM (Sequelize):

```javascript
const { User } = require('./models');

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Sequelize automatically escapes parameters
  const user = await User.findOne({
    where: {
      email: email,
      password: password // Use hashed passwords in real apps!
    }
  });
  
  if (user) {
    // User authenticated
  }
});
```

---

## 12. Logging and Monitoring

Implement comprehensive logging to detect and respond to security incidents.

### Best Practices:
- Log authentication attempts (success and failure)
- Log access to sensitive resources
- Log rate limit violations
- Monitor for suspicious patterns
- Never log sensitive data (passwords, tokens, PII)
- Use structured logging
- Set up alerts for critical events

### Node.js Example with Winston:

```javascript
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'web-app' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Log security events
app.post('/api/login', async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await authenticateUser(req.body);
    logger.info('Login successful', { 
      email, 
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json({ success: true });
  } catch (error) {
    logger.warn('Login failed', { 
      email, 
      ip: req.ip,
      reason: error.message 
    });
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Log rate limit violations
app.post('/api/submit-form', formLimiter, (req, res) => {
  // Rate limiter will automatically log violations
  logger.info('Form submission', { 
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
});
```

### Monitoring Checklist:
- [ ] Failed login attempts
- [ ] Rate limit hits
- [ ] CSRF token failures
- [ ] Invalid input patterns
- [ ] Unusual access patterns
- [ ] Error rates
- [ ] Response times

---

## 13. Pre-Deploy Security Checklist

Use this checklist before every deployment to ensure your application is secure.

### Code Review

- [ ] **No hardcoded secrets**: Search codebase for API keys, passwords, tokens
- [ ] **Environment variables**: All secrets loaded from `.env` or GitHub Secrets
- [ ] **`.gitignore` configured**: `.env`, `.env.local`, and sensitive files excluded
- [ ] **Dependencies updated**: Run `npm audit` and fix vulnerabilities
- [ ] **Security headers configured**: CSP, HSTS, X-Frame-Options, etc.

### Input Validation

- [ ] **Server-side validation**: All user input validated on backend
- [ ] **Input sanitization**: HTML/SQL/script injection protection in place
- [ ] **File upload restrictions**: Type, size, and content validation
- [ ] **URL validation**: External links and redirects validated

### Authentication & Authorization

- [ ] **HTTPS enforced**: All connections encrypted
- [ ] **CSRF protection**: Tokens implemented for state-changing operations
- [ ] **Rate limiting**: Protect against brute force and DoS
- [ ] **Bot protection**: CAPTCHA/reCAPTCHA on public forms
- [ ] **Session security**: Secure cookies, proper timeout settings

### Build & Deployment

- [ ] **Build artifacts reviewed**: Inspect `./build` or `./dist` directory
- [ ] **No secrets in build**: Check bundle for exposed API keys
- [ ] **Source maps disabled**: Don't expose source code in production
- [ ] **Error messages generic**: Don't leak system information
- [ ] **Logging configured**: Security events monitored

### Testing

- [ ] **Security testing**: Run automated security scans (npm audit, OWASP ZAP)
- [ ] **Penetration testing**: Manual testing of authentication, forms, APIs
- [ ] **Error handling**: Graceful failures without information leakage

### GitHub Pages Specific

- [ ] **Secrets in GitHub Actions**: Use repository secrets, not environment files
- [ ] **Branch protection**: Enable on `main` branch
- [ ] **Review workflow**: `.github/workflows/deploy.yml` uses secrets properly
- [ ] **HTTPS enforced**: Enable in repository settings
- [ ] **Custom domain configured**: Add CNAME if using custom domain

### Quick Command to Check for Secrets:

```bash
# Search for potential secrets in codebase
grep -r -i "api_key\|password\|secret\|token" --exclude-dir={node_modules,.git,build,dist} .

# Check for hardcoded URLs or credentials
grep -r "https://" --exclude-dir={node_modules,.git,build,dist} . | grep -i "key\|token\|pass"

# Run npm audit
npm audit

# Check for leaked secrets with git-secrets (install first)
git secrets --scan
```

---

## Complete Security Setup Example

Here's a complete Node.js/Express server with all security measures:

```javascript
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
require('dotenv').config();

const app = express();

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com/recaptcha/"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["https://www.google.com/recaptcha/"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      next();
    } else {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  });
}

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Form submission endpoint with all protections
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many form submissions, please try again later.',
});

app.post('/api/submit-form', 
  formLimiter,
  csrfProtection,
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('message').trim().isLength({ min: 10, max: 5000 }).escape(),
    body('recaptcha_token').notEmpty(),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Form validation failed', { 
        ip: req.ip, 
        errors: errors.array() 
      });
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify reCAPTCHA
    try {
      const recaptchaResult = await verifyRecaptcha(
        req.body.recaptcha_token, 
        req.ip
      );
      
      if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
        logger.warn('reCAPTCHA verification failed', { 
          ip: req.ip, 
          score: recaptchaResult.score 
        });
        return res.status(403).json({ error: 'Verification failed' });
      }
    } catch (error) {
      logger.error('reCAPTCHA error', { error: error.message });
      return res.status(500).json({ error: 'Verification error' });
    }

    // Process form
    const { email, name, message } = req.body;
    logger.info('Form submitted successfully', { 
      ip: req.ip, 
      email 
    });
    
    res.json({ success: true, message: 'Form submitted successfully' });
  }
);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Conclusion

Security is an ongoing process, not a one-time setup. Regularly:

1. Update dependencies and scan for vulnerabilities
2. Review and update security policies
3. Monitor logs for suspicious activity
4. Conduct security audits and penetration testing
5. Stay informed about new security threats
6. Train team members on security best practices

**Remember**: The best security strategy is defense in depth—multiple layers of protection working together to secure your application.
