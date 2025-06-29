# Contributing to Inspector Saab

First off, thank you for considering contributing to Inspector Saab! It's people like you that make Inspector Saab such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to [your-email@example.com].

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Request Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Setting Up Development Environment

1. Clone your fork:
\`\`\`bash
git clone https://github.com/your-username/inspector-saab.git
\`\`\`

2. Install dependencies:
\`\`\`bash
cd inspector-saab/frontend
npm install
\`\`\`

3. Create a branch:
\`\`\`bash
git checkout -b feature/my-feature
\`\`\`

4. Start development server:
\`\`\`bash
npm run dev
\`\`\`

## Code Style Guide

### JavaScript

- Use ES6+ features
- Use 2 spaces for indentation
- Use semicolons
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused
- Use async/await for asynchronous operations

### Example:

\`\`\`javascript
/**
 * Processes user input and generates UI modifications
 * @param {string} description - User's natural language input
 * @returns {Promise<Object>} - Processed instructions
 */
async function processUserInput(description) {
  try {
    const cleanInput = sanitizeInput(description);
    return await generateInstructions(cleanInput);
  } catch (error) {
    console.error('Error processing input:', error);
    throw error;
  }
}
\`\`\`

## Testing

### Unit Tests

- Write tests for new features
- Update tests when modifying existing features
- Run tests before submitting PR
- Aim for high test coverage

### Example Test:

\`\`\`javascript
describe('processUserInput', () => {
  it('should process valid input correctly', async () => {
    const result = await processUserInput('make background blue');
    expect(result).toHaveProperty('instructions');
  });
});
\`\`\`

## Documentation

### Code Comments

- Add JSDoc comments for functions
- Explain complex logic
- Document known limitations
- Add TODO comments for future improvements

### README Updates

- Update README.md with new features
- Add examples for new functionality
- Update installation instructions if needed
- Keep the documentation current

## Commit Messages

### Format

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

### Types

- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

### Example:

\`\`\`
feat(ui): add dark mode toggle

- Add dark mode toggle button
- Implement theme switching logic
- Add user preference storage

Closes #123
\`\`\`

## Branch Naming

- feature/: New features
- bugfix/: Bug fixes
- docs/: Documentation
- test/: Testing
- refactor/: Code refactoring

Example: `feature/dark-mode-toggle`

## Issue Reporting

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Browser version
- Extension version

### Feature Requests

Include:
- Clear description
- Use case
- Proposed solution
- Alternative solutions considered
- Screenshots/mockups if applicable

## Code Review Process

1. Submit PR with clear description
2. Address review comments
3. Update tests if needed
4. Update documentation
5. Get approval from maintainers
6. Squash commits if requested
7. Merge after approval

## Questions?

Feel free to contact the maintainers:
- Email: sarthaksri1998@gmail.com
