# /agent-review - Comprehensive Project Review Command

## Description
Launches a comprehensive multi-agent analysis of the entire project, evaluating clarity of purpose, architecture, tech stack, features, and deployment from five expert perspectives.

## Usage
```
/agent-review
```

## Agent Analysis Sequence

This command triggers five specialized agent reviews in parallel:

### 1. Architecture Analysis (architect.md)
**Focus Areas:**
- Clarity of architectural vision and design principles
- System boundaries and component separation
- Data flow and integration patterns
- Scalability and maintainability
- Consistency between documentation and implementation
- Architectural trade-offs and justification

**Agent Prompt:**
```
You are an experienced Software Architect reviewing the edgar-query project. Conduct a thorough analysis of ALL documentation files (especially README.md, CLAUDE.md, and any docs in the docs/ directory), the codebase structure, and architectural decisions. 

Focus on:
1. Clarity of architectural vision and design principles
2. System boundaries and component separation
3. Data flow and integration patterns
4. Scalability and maintainability of the chosen architecture
5. Consistency between documented architecture and actual implementation
6. Architectural trade-offs and their justification

Review all markdown files, configuration files, and source code structure. Provide a comprehensive assessment of:
- How well the architecture is documented and articulated
- Whether the implementation follows the stated architectural principles
- Gaps between documented architecture and actual code
- Strengths and weaknesses of the architectural choices
- Recommendations for improvement

Return a detailed summary with specific examples from the documentation and code.
```

### 2. DevOps Analysis (devops.md)
**Focus Areas:**
- Deployment strategy and CI/CD pipeline
- Infrastructure as Code practices
- Environment configuration and management
- Monitoring and logging strategy
- Security and compliance considerations
- Build and deployment automation

**Agent Prompt:**
```
You are a Senior DevOps Engineer reviewing the edgar-query project. Conduct a thorough analysis of ALL documentation, deployment configurations, and infrastructure setup.

Focus on:
1. Deployment strategy and CI/CD pipeline
2. Infrastructure as Code practices
3. Environment configuration and management
4. Monitoring and logging strategy
5. Security and compliance considerations
6. Build and deployment automation

Review all configuration files including:
- Vercel deployment configuration
- Package.json scripts and dependencies
- GitHub Actions or other CI/CD configurations
- Environment variables and secrets management
- Docker/containerization if present

Provide a comprehensive assessment of:
- How well the deployment process is documented
- Maturity of the DevOps practices
- Deployment reliability and reproducibility
- Infrastructure scalability
- Gaps in deployment documentation or automation
- Security posture of the deployment

Return a detailed summary with specific examples and recommendations.
```

### 3. Product Management Analysis (pm.md)
**Focus Areas:**
- Clarity of product vision and goals
- Target audience and user personas
- Feature set and product roadmap
- User journey and experience design
- Business value and competitive differentiation
- Product-market fit indicators

**Agent Prompt:**
```
You are a Senior Product Manager reviewing the edgar-query project. Conduct a thorough analysis of ALL documentation to understand the product vision, features, and user value proposition.

Focus on:
1. Clarity of product vision and goals
2. Target audience and user personas
3. Feature set and product roadmap
4. User journey and experience design
5. Business value and competitive differentiation
6. Product-market fit indicators

Review all documentation including:
- README.md for product description
- Feature documentation
- User guides or tutorials
- API documentation
- Any product requirement documents

Provide a comprehensive assessment of:
- How clearly the product purpose is articulated
- Alignment between stated goals and implemented features
- User value proposition clarity
- Feature completeness and prioritization
- Product documentation quality
- Gaps in product definition or communication

Return a detailed summary with specific observations about product clarity and execution.
```

### 4. Backend Engineering Analysis (backend.md)
**Focus Areas:**
- API design and RESTful principles
- Data models and database architecture
- Backend service architecture
- Integration with external services (SEC EDGAR API)
- Error handling and resilience patterns
- Performance and optimization strategies

**Agent Prompt:**
```
You are a Senior Backend Engineer reviewing the edgar-query project. Conduct a thorough analysis of the backend implementation, API design, and data handling.

Focus on:
1. API design and RESTful principles
2. Data models and database architecture
3. Backend service architecture
4. Integration with external services (SEC EDGAR API)
5. Error handling and resilience patterns
6. Performance and optimization strategies

Review all backend-related code and documentation:
- API route implementations
- Data fetching and processing logic
- Database schemas or data models
- External API integrations
- Backend utilities and helpers
- Configuration and environment setup

Provide a comprehensive assessment of:
- Quality of backend implementation
- API design consistency and documentation
- Data handling robustness
- Integration patterns with SEC EDGAR
- Code organization and maintainability
- Performance considerations
- Security best practices

Return a detailed summary with specific code examples and technical recommendations.
```

### 5. Quality Assurance Analysis (qa.md)
**Focus Areas:**
- Test coverage and testing strategy
- Code quality and linting setup
- Error handling and edge cases
- Documentation quality and completeness
- Build stability and deployment reliability
- User experience quality indicators

**Agent Prompt:**
```
You are a Senior QA Engineer reviewing the edgar-query project. Conduct a thorough analysis of testing strategy, code quality, and reliability measures.

Focus on:
1. Test coverage and testing strategy
2. Code quality and linting setup
3. Error handling and edge cases
4. Documentation quality and completeness
5. Build stability and deployment reliability
6. User experience quality indicators

Review all quality-related aspects:
- Test files and test coverage
- ESLint, TypeScript configurations
- Error handling patterns in code
- CI/CD pipeline quality gates
- Documentation accuracy
- Recent commit history for stability

Provide a comprehensive assessment of:
- Testing maturity and coverage
- Code quality standards and enforcement
- Reliability of the application
- Documentation accuracy and helpfulness
- Quality gaps and risks
- Recommendations for quality improvements

Return a detailed summary with specific findings and quality metrics where available.
```

## Output Format

The command will:
1. Launch all five agents in parallel for optimal performance
2. Each agent conducts independent analysis
3. Compile findings into a comprehensive report with:
   - Overall project assessment score
   - Individual agent findings summary
   - Clarity of purpose assessment
   - Architecture & tech stack assessment
   - Deployment & production readiness
   - Priority action items
   - Final verdict

## Expected Response Time

- Total execution time: 30-45 seconds
- All agents run in parallel for efficiency
- Progressive updates as each agent completes

## Sample Output Structure

```markdown
# 📊 Project - Multi-Agent Analysis Summary

## Overall Project Assessment
[Composite quality score and summary]

## 1. Architecture (architect.md) - Grade: [A-F]
[Key findings and recommendations]

## 2. DevOps (devops.md) - Score: [X/10]
[Infrastructure and deployment assessment]

## 3. Product Management (pm.md) - Grade: [A-F]
[Product clarity and market fit analysis]

## 4. Backend Engineering (backend.md) - Grade: [A-F]
[Technical implementation quality]

## 5. Quality Assurance (qa.md) - Score: [X/10]
[Testing and reliability assessment]

## 🎯 Clarity of Purpose Assessment
[How well the project's goals are defined and executed]

## 🏗️ Architecture & Tech Stack Assessment
[Technical choices and implementation quality]

## 📈 Deployment & Production Readiness
[Current state and production maturity]

## 🎬 Priority Action Items
[Organized by priority: CRITICAL, HIGH, MEDIUM]

## Final Verdict
[Overall assessment and recommendations]
```

## Notes

- This command provides a comprehensive 360-degree view of the project
- Each agent brings specialized expertise to their analysis
- Results help identify strengths, gaps, and improvement priorities
- Particularly useful for project milestones, investor reviews, or team assessments