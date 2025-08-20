/**
 * JSCodeshift transformer to migrate single-domain useData consumers
 * 
 * Usage: npx jscodeshift -t migrate-users-only.js src/
 * 
 * This transformer identifies components that only use user-related data
 * from useData() and migrates them to use useUsers() instead.
 */

const userFields = [
  'userData', 'allUsers', 'userName', 'userId', 'user', 'setUserData',
  'loadingProfile', 'isAdmin', 'isDesigner', 'isBuilder', 'isVendor', 'isClient',
  'fetchUserProfile', 'refreshUsers', 'updateUserProfile'
];

const projectFields = [
  'projects', 'allProjects', 'activeProject', 'setActiveProject', 'selectedProjects', 
  'setSelectedProjects', 'projectsError', 'fetchProjects', 'fetchProjectDetails',
  'updateTimelineEvents', 'updateProjectFields', 'pendingInvites'
];

const messageFields = [
  'projectMessages', 'setProjectMessages', 'dmThreads', 'setDmThreads', 
  'dmReadStatus', 'setDmReadStatus', 'deletedMessageIds', 'markMessageDeleted',
  'clearDeletedMessageId', 'toggleReaction'
];

const uiFields = [
  'isLoading', 'setIsLoading', 'opacity', 'setOpacity', 'settingsUpdated',
  'toggleSettingsUpdated', 'projectsViewState', 'setProjectsViewState', 'fetchRecentActivity'
];

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Find useData imports
  const useDataImports = root.find(j.ImportDeclaration, {
    source: { value: (value) => value.includes('DataProvider') }
  });

  if (useDataImports.length === 0) {
    return null; // No useData imports found
  }

  // Find useData destructuring
  const useDataCalls = root.find(j.VariableDeclarator, {
    id: { type: 'ObjectPattern' },
    init: {
      type: 'CallExpression',
      callee: { name: 'useData' }
    }
  });

  let hasChanges = false;

  useDataCalls.forEach(path => {
    const destructuredProps = path.value.id.properties.map(prop => prop.key.name);
    
    // Classify the usage
    const usesUsers = destructuredProps.some(prop => userFields.includes(prop));
    const usesProjects = destructuredProps.some(prop => projectFields.includes(prop));
    const usesMessages = destructuredProps.some(prop => messageFields.includes(prop));
    const usesUI = destructuredProps.some(prop => uiFields.includes(prop));
    
    const domainCount = [usesUsers, usesProjects, usesMessages, usesUI].filter(Boolean).length;
    
    // Only migrate if it's a single domain (users-only in this transformer)
    if (domainCount === 1 && usesUsers) {
      // Replace useData() with useUsers()
      path.value.init.callee.name = 'useUsers';
      
      // Update import to use UsersContext
      useDataImports.forEach(importPath => {
        const specifiers = importPath.value.specifiers;
        const useDataSpecifier = specifiers.find(spec => 
          spec.type === 'ImportSpecifier' && spec.imported.name === 'useData'
        );
        
        if (useDataSpecifier) {
          useDataSpecifier.imported.name = 'useUsers';
          useDataSpecifier.local.name = 'useUsers';
          
          // Update the import path
          importPath.value.source.value = importPath.value.source.value.replace(
            'DataProvider',
            'UsersContext'
          );
        }
      });
      
      hasChanges = true;
      
      // Add a comment indicating the migration
      const comment = j.commentLine(' Migrated from useData() to useUsers() - single domain usage');
      path.value.id.comments = [comment];
    }
  });

  return hasChanges ? root.toSource() : null;
};

module.exports.parser = 'tsx';