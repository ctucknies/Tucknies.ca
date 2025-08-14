# Theme System Migration Guide

## Issue Identified
The application had inconsistent UI colors between users due to:
1. Multiple conflicting theme systems (Tailwind + styled-components)
2. Race conditions in theme initialization
3. No system preference detection
4. Hardcoded dark styling in some components

## Changes Made

### 1. New Theme Hook (`src/hooks/useTheme.js`)
- Centralized theme management
- System preference detection
- Prevents flash of unstyled content
- Proper localStorage handling

### 2. Updated App.jsx
- Removed inline theme logic
- Uses new ThemeProvider
- Consistent theme application

### 3. Fixed LeagueManager.jsx
- Removed hardcoded dark background
- Now uses responsive `dark:` classes

### 4. Added Theme Initialization Script
- Prevents flash of unstyled content
- Runs before React loads
- Respects system preferences

## Recommended Next Steps

### 1. Remove Legacy Theme Files
```bash
rm src/theme/themes.js
rm src/theme/GlobalStyles.js
rm src/components/ThemeToggler.jsx
```

### 2. Update All Components
Replace any remaining styled-components theme references with Tailwind classes:

**Before:**
```jsx
const StyledDiv = styled.div`
  background: ${props => props.theme.background};
  color: ${props => props.theme.color};
`;
```

**After:**
```jsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

### 3. Standardize Color Classes
Use consistent Tailwind color patterns:
- Text: `text-gray-900 dark:text-white`
- Backgrounds: `bg-white dark:bg-gray-900`
- Borders: `border-gray-200 dark:border-gray-700`
- Cards: `bg-white dark:bg-gray-800`

### 4. Test Theme Consistency
- Test in different browsers
- Test with system dark/light mode
- Test theme toggle functionality
- Verify no flash of unstyled content

## Benefits
- ✅ Consistent UI across all users
- ✅ Respects system preferences
- ✅ No flash of unstyled content
- ✅ Single source of truth for theming
- ✅ Better performance (no styled-components overhead)