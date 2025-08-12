# Resume Project Command

**Command**: `/resume`

**Description**: Comprehensive project review and action plan generator

**Instructions**:
When the user types `/resume`, you should:

1. **Review ALL project documentation** in this order:
   - `/README.md` - Project overview and current status
   - `/docs/PROJECT_ROADMAP.md` - Complete development phases and timeline
   - `/docs/ARCHITECTURE_REFERENCE.md` - Technical architecture and design decisions
   - `/docs/completed/` folder - All completed phase documentation
   - Check current working directory and recent git commits for context

2. **Analyze current state**:
   - Identify which phases are completed vs. pending
   - Review validation gates and their status
   - Assess what components are built and tested
   - Check for any blocking issues or dependencies

3. **Generate comprehensive response** with these sections:
   
   ## 🎯 Project Summary
   - Brief project description and goals
   - Current phase and overall progress percentage
   - Key technologies and architecture decisions
   
   ## ✅ Work Completed
   - List all completed phases with key achievements
   - Highlight major components built and validated
   - Note any significant technical innovations
   
   ## 🚧 Current Status
   - What phase/task is currently in progress
   - Any blocking issues or dependencies
   - Recent development activity
   
   ## 📋 Next Action Plan
   - Immediate next steps (next 1-2 tasks)
   - Current phase objectives and validation gates
   - Estimated timeline for upcoming work
   
   ## 🎯 Success Criteria
   - What needs to be achieved to complete current phase
   - Key validation checkpoints coming up
   - Dependencies for future phases

4. **Use TodoWrite tool** to create/update todo list based on action plan

5. **Be ready to execute** - After providing the summary, be prepared to immediately begin working on the next prioritized task

**Context**: This command is designed for project continuity when resuming work after a break, ensuring full context is restored and next steps are clear.

**Example Usage**:
```
User: /resume
Assistant: [Comprehensive project review and action plan as described above]
```