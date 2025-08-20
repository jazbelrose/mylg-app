# Codemod Plan for DataProvider Refactoring

## Analysis and Classification

### Step 1: Classify Consumer Components

Run this analysis script to categorize components by their data usage:

```bash
# Find all files using useData
find src/ -name "*.js" -o -name "*.jsx" | xargs grep -l "useData" > usedata-consumers.txt

# Analyze each file for domain usage
node scripts/analyze-usedata-consumers.js
```

### Component Categories:

1. **Users-only consumers** - Only use user-related data
   - `userData`, `allUsers`, `refreshUsers`, `fetchUserProfile`
   - Can be safely migrated to `useUsers()`

2. **Projects-only consumers** - Only use project-related data  
   - `projects`, `activeProject`, `fetchProjects`, `updateProjectFields`
   - Can be safely migrated to `useProjects()`

3. **Messages-only consumers** - Only use message-related data
   - `projectMessages`, `dmThreads`, `toggleReaction`
   - Can be safely migrated to `useMessages()`

4. **Mixed consumers** - Use data from multiple domains
   - Should remain on `useData()` shim temporarily
   - Consider component splitting later

5. **UI-only consumers** - Only use UI state
   - `isLoading`, `opacity`, `projectsViewState`
   - Can continue using `useData()` or be migrated to local state

## Automated Migration Strategy

### Phase 1: Single-Domain Components (Safe to migrate)

```javascript
// Example: Users-only component
// BEFORE:
const { userData, allUsers, refreshUsers } = useData();

// AFTER:  
const { userData, allUsers, refreshUsers } = useUsers();
```

### Phase 2: Mixed Components (Manual review required)

For components using multiple domains, consider:
1. **Component splitting** - Extract domain-specific parts into separate components
2. **Prop drilling** - Pass data down from a parent that uses multiple hooks
3. **Custom hook** - Create a composite hook for specific use cases

## Migration Script

```bash
# Step 1: Identify single-domain consumers
npx jscodeshift -t scripts/codemods/classify-usedata-consumers.js src/

# Step 2: Migrate single-domain consumers  
npx jscodeshift -t scripts/codemods/migrate-users-only.js src/
npx jscodeshift -t scripts/codemods/migrate-projects-only.js src/
npx jscodeshift -t scripts/codemods/migrate-messages-only.js src/

# Step 3: Generate report for manual review
npx jscodeshift -t scripts/codemods/generate-migration-report.js src/
```

## Success Metrics

- [ ] Reduce `useData()` usage by 60%+ for single-domain components
- [ ] No functionality regressions
- [ ] Improved performance (fewer re-renders)
- [ ] Better component testability
- [ ] Clearer data dependencies

## Timeline

- **Week 1**: Analysis and classification
- **Week 2**: Automated migration of single-domain components  
- **Week 3**: Manual review and splitting of mixed components
- **Week 4**: Testing and performance validation