# EDGAR Answer Engine - MVP Launch Tasks (REVISED)

## ✅ Already Completed
- **Neon PostgreSQL**: Database configured and working
- **Upstash Redis**: Connected and responding (PONG confirmed)
- **Vercel Blob Storage**: Token configured and working
- **Vercel Project**: Created and deploying successfully
- **All Code**: 100% complete and building successfully
- **Local Testing**: Health checks passing with database/Redis/blob

## ❌ Remaining Tasks for Launch

---

## Task 1: Deploy MCP HTTP Bridge to Railway (CRITICAL)
*Estimated Time: 30-45 minutes*
*This is the ONLY missing piece blocking full functionality*

### 1.1 Prepare for Railway Deployment
```bash
cd services/edgar-mcp-http-bridge

# Verify it builds (you've already done this)
npm run build

# Test locally one more time
npm start
# In another terminal:
curl http://localhost:3001/health
```

### 1.2 Deploy to Railway
```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway (creates account if needed)
railway login

# Initialize new Railway project
railway init --name "edgar-mcp-bridge"

# Deploy the service
railway up
```

### 1.3 Configure Railway Environment Variables
In Railway dashboard (https://railway.app):
```env
PORT=3001
NODE_ENV=production
SEC_EDGAR_USER_AGENT=EdgarAnswerEngine/1.0 (your-real-email@domain.com)
API_KEY=<generate-secure-32-character-key>
ALLOWED_ORIGINS=https://*.vercel.app,http://localhost:3000
```

### 1.4 Get Railway Service URL
```bash
# Railway will provide a URL like:
# https://edgar-mcp-bridge-production-xxxx.up.railway.app

railway domain
# Save this URL for next step
```

### 1.5 Verify Railway Deployment
```bash
# Test the deployed service
curl https://your-railway-url.up.railway.app/health

# Should return:
# {"status":"ok","service":"edgar-mcp-http-bridge",...}
```

---

## Task 2: Connect MCP Service to Vercel
*Estimated Time: 10 minutes*

### 2.1 Add Environment Variables to Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

ADD these two NEW variables:
```env
EDGAR_MCP_SERVICE_URL=https://your-railway-url.up.railway.app
EDGAR_MCP_API_KEY=<same-key-from-railway>
```

Your existing variables should remain:
- ✅ DATABASE_URL (already set)
- ✅ REDIS_URL (already set)  
- ✅ BLOB_READ_WRITE_TOKEN (already set)
- ✅ SEC_USER_AGENT (already set)

### 2.2 Redeploy Vercel App
```bash
cd apps/web

# Trigger new deployment with updated env vars
vercel --prod

# Or push to git if connected to GitHub
git push origin main
```

---

## Task 3: Production Verification
*Estimated Time: 15 minutes*

### 3.1 Test Health Check
```bash
curl https://your-app.vercel.app/api/health

# Should now show:
# "edgar": {
#   "client": true,
#   "mcp": true,  <-- This should be true now!
#   "dataSource": "MCP"
# }
```

### 3.2 Test Company Queries
```bash
# Test with MCP service
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What was Apple revenue last quarter?"}]}'

# Should return company data using MCP service
```

### 3.3 Test Fallback
```bash
# Temporarily stop Railway service to test fallback
railway down

# Test again - should still work via SEC API
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "MSFT recent filings"}]}'

# Restart Railway service
railway up
```

---

## Task 4: Domain Setup (Optional but Recommended)
*Estimated Time: 30 minutes*

### 4.1 Add Custom Domain to Vercel
```bash
# In Vercel Dashboard → Domains
# Add your domain (e.g., edgar-answer.com)
# Update DNS records as instructed
```

### 4.2 Update CORS in Railway
Update Railway env var:
```env
ALLOWED_ORIGINS=https://edgar-answer.com,https://*.vercel.app
```

### 4.3 Update Vercel Public URL
```env
NEXT_PUBLIC_APP_URL=https://edgar-answer.com
```

---

## Task 5: Enable Monitoring
*Estimated Time: 20 minutes*

### 5.1 Vercel Analytics
- Go to Vercel Dashboard → Analytics → Enable
- No code changes needed
- Tracks usage automatically

### 5.2 Simple Uptime Monitoring
- Go to uptimerobot.com (free)
- Add monitor for: https://your-app.vercel.app/api/health
- Check every 5 minutes
- Alert via email if down

### 5.3 Railway Monitoring
- Railway dashboard shows logs automatically
- Check memory/CPU usage
- Set up alerts if needed

---

## Task 6: Soft Launch
*Estimated Time: 1 hour*

### 6.1 Final Checklist
- [ ] MCP service responding on Railway
- [ ] Vercel app shows mcp: true in health check
- [ ] Test queries work in browser UI
- [ ] Mobile view looks acceptable
- [ ] Error messages are user-friendly

### 6.2 Share with Beta Users
- [ ] Share link with 5-10 trusted users
- [ ] Ask for specific feedback:
  - Speed of responses
  - Clarity of answers
  - Any errors encountered
  - Missing features they want

### 6.3 Monitor First 24 Hours
- [ ] Check Railway logs for errors
- [ ] Check Vercel Functions log
- [ ] Monitor query success rate
- [ ] Note any timeout issues

---

## Task 7: Public Launch
*Estimated Time: 2 hours*

### 7.1 Create Launch Content
- [ ] Screenshot/GIF of the interface
- [ ] List of example queries that work
- [ ] Clear statement of current capabilities

### 7.2 Launch Channels
**Twitter/X Post Example:**
```
🚀 Launching EDGAR Answer Engine!

Ask questions about SEC filings in plain English:
✅ "What was Apple's revenue last quarter?"
✅ "Show me Tesla's recent 8-K filings"
✅ "What are Microsoft's main risks?"

Try it free: https://edgar-answer.com

Built with @vercel + @railway
```

**LinkedIn Post:**
- Target: Financial analysts, investors
- Emphasize time-saving benefits
- Include professional use cases

**Reddit (be careful with self-promotion rules):**
- r/algotrading (Tool Tuesday thread)
- r/SecurityAnalysis (check rules first)
- r/investing (daily thread only)

---

## 📊 Total Time Investment

**From where you are NOW to launched:**
- Task 1 (Railway): 45 minutes
- Task 2 (Connect): 10 minutes
- Task 3 (Verify): 15 minutes
- Task 4 (Domain): 30 minutes (optional)
- Task 5 (Monitoring): 20 minutes
- Task 6 (Soft Launch): 1 hour
- Task 7 (Public Launch): 2 hours

**Minimum to functional MVP**: 1 hour (Tasks 1-3)
**Full production launch**: 4-5 hours total

---

## 💰 Costs Reminder

**What you're already paying for:**
- Neon PostgreSQL: Free tier
- Upstash Redis: Free tier
- Vercel: Free or Pro ($20/month)

**New costs:**
- Railway: ~$5-10/month for MCP service
- Domain: $15/year (optional)

**Total additional cost**: $5-10/month

---

## 🚨 Common Issues & Solutions

**Issue**: Railway deployment fails
**Solution**: Check Docker is in your package.json dependencies

**Issue**: MCP service not connecting from Vercel
**Solution**: Verify API_KEY matches in both Railway and Vercel

**Issue**: CORS errors in browser
**Solution**: Update ALLOWED_ORIGINS in Railway to include your Vercel URL

**Issue**: Slow responses
**Solution**: Railway may need to wake up - consider upgrading to keep warm

---

## ✅ You're 1 Hour Away from Launch!

The ONLY critical missing piece is deploying the MCP service to Railway. Everything else is already built, configured, and tested. Once Railway is up, your MVP is live!