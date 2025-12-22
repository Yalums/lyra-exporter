# Pull Request

## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Dependency update
- [ ] Configuration change

## Security & Deployment Checklist

### Security Review

- [ ] **No secrets exposed**: Verified that no API keys, passwords, or tokens are committed
- [ ] **Environment variables**: All sensitive data uses environment variables or GitHub Secrets
- [ ] **Dependencies checked**: Ran `npm audit` and addressed any vulnerabilities
- [ ] **Input validation**: All user input is properly validated and sanitized
- [ ] **No hardcoded URLs**: No sensitive URLs or credentials in the code

### Code Quality

- [ ] **Code follows project style**: Consistent with existing code patterns
- [ ] **Documentation updated**: README, comments, or docs updated if needed
- [ ] **No console.log**: Removed debug statements (or using proper logging)
- [ ] **Error handling**: Appropriate error handling implemented

### Build & Testing

- [ ] **CI checks pass**: All automated checks (linting, tests, builds) pass
- [ ] **Build artifacts reviewed**: Inspected `./build` directory for unexpected files
- [ ] **Local testing**: Tested changes locally with `npm start`
- [ ] **Build successful**: Ran `npm run build` successfully

### Deployment Impact

- [ ] **Breaking changes documented**: Any breaking changes are clearly documented
- [ ] **Deployment notes**: Special deployment steps or migration notes included
- [ ] **Rollback plan**: Considered rollback approach if needed
- [ ] **GitHub Pages compatible**: Changes work with GitHub Pages deployment

### Review Notes

<!-- Add any additional context, screenshots, or notes for reviewers -->

## Related Issues

<!-- Link to related issues, e.g., "Closes #123" or "Relates to #456" -->

## Testing Performed

<!-- Describe the testing you performed -->

- [ ] Manual testing in local environment
- [ ] Build verification
- [ ] Browser testing (if UI changes)
- [ ] Mobile responsive testing (if applicable)

## Screenshots (if applicable)

<!-- Add screenshots to show visual changes -->

## Additional Notes

<!-- Any additional information that reviewers should know -->
