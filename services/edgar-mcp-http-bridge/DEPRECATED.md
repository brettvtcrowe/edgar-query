# ⚠️ DEPRECATED - Railway HTTP Bridge Service

## THIS SERVICE IS DEPRECATED AND SHOULD NOT BE USED

**Status**: ABANDONED  
**Reason**: Multiple deployment failures on Railway platform  
**Replacement**: Google Cloud Run deployment  
**Decision Date**: January 2025  

---

## Why This Service Was Deprecated

### Railway Deployment Issues
1. **Python Path Problems**: Persistent issues with Python module paths in Railway environment
2. **Docker-in-Docker Complexity**: Attempted to run Docker container within Railway container
3. **Multiple Failed Attempts**: See git history - numerous attempts to fix deployment all failed
4. **Platform Limitations**: Railway not optimal for MCP server requirements

### What We Learned
- The SEC EDGAR MCP Docker image works perfectly when tested locally
- Railway's deployment model doesn't align well with MCP requirements
- Google Cloud Run is the official recommended platform for MCP hosting

---

## DO NOT USE THIS SERVICE

### Instead, Use:
- **Platform**: Google Cloud Run (ONLY)
- **Documentation**: [GCP_DEPLOYMENT_GUIDE.md](../../docs/GCP_DEPLOYMENT_GUIDE.md)
- **Platform Decision**: [MCP_DEPLOYMENT_STATUS.md](../../docs/MCP_DEPLOYMENT_STATUS.md)
- **Docker Image**: `stefanoamorelli/sec-edgar-mcp:latest`

---

## Migration Path

If you're looking at this service for any reason:

1. **STOP** - Do not attempt to resurrect this Railway deployment
2. **READ** - [MCP_DEPLOYMENT_STATUS.md](../../docs/MCP_DEPLOYMENT_STATUS.md)
3. **FOLLOW** - [GCP_DEPLOYMENT_GUIDE.md](../../docs/GCP_DEPLOYMENT_GUIDE.md)

---

## Historical Context

This service was an attempt to create an HTTP bridge for the SEC EDGAR MCP on Railway. After extensive testing and debugging, we discovered:
- The MCP itself works perfectly (confirmed via local testing)
- Railway platform has fundamental incompatibilities with our deployment needs
- Google Cloud Run provides the correct environment for MCP hosting

---

## Files in This Directory

All files in this directory are DEPRECATED and kept only for historical reference:
- `server.ts` - Express HTTP bridge (DO NOT USE)
- `edgar-mcp-client.ts` - Python spawn wrapper (DO NOT USE)
- `nixpacks.toml` - Railway config (ABANDONED)
- `railway.json` - Railway project config (ABANDONED)
- `Dockerfile` - Various Docker attempts (FAILED)

---

**THIS ENTIRE DIRECTORY SHOULD BE DELETED ONCE THE GOOGLE CLOUD RUN DEPLOYMENT IS COMPLETE**

---

Last Updated: January 2025  
Status: DEPRECATED - DO NOT USE