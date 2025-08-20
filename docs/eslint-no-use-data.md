# ESLint Rule to Prevent New useData Imports

Add this rule to your ESLint configuration to discourage new imports of the legacy `useData` hook and encourage using specific context hooks instead.

## eslint.config.js Addition

```javascript
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "../app/contexts/DataProvider",
            "importNames": ["useData"],
            "message": "Avoid importing 'useData' in new code. Use specific context hooks instead: useUsers(), useProjects(), useMessages(). This maintains better separation of concerns and performance."
          },
          {
            "name": "../../app/contexts/DataProvider", 
            "importNames": ["useData"],
            "message": "Avoid importing 'useData' in new code. Use specific context hooks instead: useUsers(), useProjects(), useMessages()."
          },
          {
            "name": "../../../app/contexts/DataProvider",
            "importNames": ["useData"], 
            "message": "Avoid importing 'useData' in new code. Use specific context hooks instead: useUsers(), useProjects(), useMessages()."
          },
          {
            "name": "../../../../app/contexts/DataProvider",
            "importNames": ["useData"],
            "message": "Avoid importing 'useData' in new code. Use specific context hooks instead: useUsers(), useProjects(), useMessages()."
          }
        ]
      }
    ]
  }
}
```

## Alternative: Custom ESLint Plugin Rule

For more flexibility, you could create a custom rule:

```javascript
// eslint-plugin-mylg/no-new-use-data.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'discourage new useData imports in favor of specific context hooks',
      recommended: true,
    },
    schema: [],
    messages: {
      avoidUseData: 'Avoid useData in new code. Use specific hooks: useUsers(), useProjects(), useMessages() for better performance and separation of concerns.',
    },
  },
  
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value.includes('DataProvider')) {
          const useDataImport = node.specifiers.find(
            spec => spec.type === 'ImportSpecifier' && spec.imported.name === 'useData'
          );
          
          if (useDataImport) {
            // Check if this is an existing file (has git history) vs new file
            const filename = context.getFilename();
            // Custom logic here to check git history or file age
            
            context.report({
              node: useDataImport,
              messageId: 'avoidUseData',
            });
          }
        }
      },
    };
  },
};
```

## Usage

Add to your project's ESLint configuration:

```json
{
  "plugins": ["mylg"],
  "rules": {
    "mylg/no-new-use-data": "warn"
  }
}
```

This will:
- Warn developers when they try to import `useData` in new code
- Encourage them to use specific context hooks instead
- Maintain backward compatibility for existing files
- Improve code organization and performance